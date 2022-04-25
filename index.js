//@ts-check

const functions = require('@google-cloud/functions-framework')
const luxon = require('luxon');
const preferences = require('./preferences')
const process = require('process')
const puppeteer = require('puppeteer')
const schema = require('./schema')
const timers = require('timers/promises');

/**
 * @template T
 * @param {string} username
 * @param {string} operation
 * @param {Promise<T>} promise
 * @returns {Promise<T>}
 */
const instrument = async (username, operation, promise) => {
  console.log(`[START][${username}] ${operation}`)
  const start = process.hrtime.bigint()
  const result = await promise
  const end = process.hrtime.bigint()
  const ns = (end - start)
  const ms = ns / 1_000_000n
  console.log(`[END][${username}] ${operation} took ${ms}ms`)
  return result
}

/**
 * @param {luxon.Duration} duration
 * @returns {Promise<void>}
 */
const wait = (duration) => timers.setTimeout(duration.milliseconds)

/**
 * @param {schema.settings} settings
 */
const signUp = async (settings) => {
  const isLocal = process.env.FUNCTION_TARGET === undefined
  const localOpts = isLocal ? {
    headless: false,
    executablePath: 'google-chrome',
  } : {}
  const browser = await instrument('global', 'puppeteer.launch', puppeteer.launch({
    args: [
      '--no-sandbox',
    ],
    ...localOpts
  }))
  const zone = new luxon.IANAZone('America/New_York')
  const weekday = luxon.DateTime.now().plus(luxon.Duration.fromObject({
    days: 5
  })).setZone(zone).weekdayLong
  await Promise.all(settings.map(async ({
    username,
    password,
    classes
  }) => {
    const context = await instrument(username, `browser.createContext(${username})`, browser.createIncognitoBrowserContext())
    const page = await instrument(username, 'context.newPage', context.newPage())
    const response = await instrument(username, 'page.goto', page.goto('https://app.wodify.com/Schedule/CalendarListView.aspx'))
    const usernameSelector = '#Input_UserName'
    const passwordSelector = '#Input_Password'
    const clickOptions = {
      // Include some jitter.
      delay: 50 + 50 * Math.random()
    }
    await Promise.all([
      instrument(username, 'page.wait(username)', page.waitForSelector(usernameSelector)),
      instrument(username, 'page.wait(password)', page.waitForSelector(passwordSelector)),
    ])
    await instrument(username, 'page.type(username)', page.type(usernameSelector, username, clickOptions))
    await instrument(username, 'page.type(password)', page.type(passwordSelector, password, clickOptions))
    await Promise.all([
      instrument(username, 'page.wait(navigation)', page.waitForNavigation()),
      instrument(username, 'page.click(login)', page.click('#FormLogin button', clickOptions)),
    ])
    while (true) {
      let signedUp = false
      // NB: Do this sequentially because we can't identify individual reservation responses.
      for (const [program, days] of Object.entries(classes)) {
        for (const [day, time] of Object.entries(days)) {
          if (day.localeCompare(weekday, [], {
              sensitivity: 'base'
            }) != 0) {
            console.log(`[${username}] skipping ${day} != ${weekday}`)
            continue
          }
          const xpath = `//*[@onclick][descendant::*[contains(@class, "icon-calendar") and not(contains(@class, "disabled"))]][ancestor::tr[1][descendant::*[text() = "${program}"] and (preceding-sibling::tr[descendant::*[contains(text(), "DAY")]][1][descendant::*[text() = "${day}"]] and descendant::*[text() = "${time}"])]]`;
          const elements = await instrument(username, `page.$x(${day}:${program}@${time})`, page.$x(xpath))
          // NB: Do this sequentially to avoid "node is not clickable" errors.
          for (const element of elements) {
            await Promise.all([
              instrument(username, `(${day}:${program}@${time}).click()`, element.click(clickOptions)),
              instrument(username, 'page.wait(Response)', page.waitForResponse(async (response) => {
                if (!response.url().startsWith('https://app.wodify.com/Schedule/CalendarListView.aspx')) {
                  return false
                }
                const text = await response.text();
                if (!text.includes('CalendarList.Reserve')) {
                  return false
                }
                return true
              })),
            ])
            signedUp = true
          }
        }
      }
      if (isLocal || signedUp) {
        break
      }
      const deadline = luxon.DateTime.fromObject({
        hour: 13,
        minute: 59,
        second: 59,
        millisecond: 500
      }, {
        zone
      })
      const interval = luxon.DateTime.now().until(deadline)
      if (interval.isValid) {
        await instrument(username, `wait(${interval.toString()})`, wait(interval.toDuration()))
      }
      await Promise.all([
        instrument(username, 'page.click(reset)', page.click('[value="Reset"]', clickOptions)),
        instrument(username, 'page.wait(Response)', page.waitForResponse(async (response) => {
          if (!response.url().startsWith('https://app.wodify.com/Schedule/CalendarListView.aspx')) {
            return false
          }
          const text = await response.text();
          if (!text.includes('CalendarList.Filter')) {
            return false
          }
          return true
        })),
      ])
    }
    await instrument(username, 'context.close', context.close())
  }))
  await instrument('global', 'browser.close', browser.close())
}

functions.http('signUp', async (req, res) => {
  try {
    await signUp(preferences.settings)
    res.contentType('text').status(200).send()
  } catch (e) {
    res.contentType('text').status(500).send(JSON.stringify(e))
    throw e
  }
})

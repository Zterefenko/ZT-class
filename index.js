//@ts-check

const functions = require('@google-cloud/functions-framework')
const luxon = require('luxon')
const preferences = require('./preferences')
const process = require('process')
const puppeteer = require('puppeteer')
const schema = require('./schema')
const timers = require('timers/promises')

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
    schedule,
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
    let pending = 0;
    const pendingOp = () => `[CONT][${username}] page.on('response') pending=${pending}`
    /**
     * @type Promise<void>
     */
    const complete = new Promise((resolve) => {
      page.on('response', async (response) => {
        if (!response.url().startsWith('https://app.wodify.com/Schedule/CalendarListView.aspx')) {
          return
        }
        const text = await response.text();
        if (!text.includes('CalendarList.Reserve')) {
          return
        }
        if (pending == 0) {
          console.error(pendingOp())
        } else {
          pending--
          console.log(pendingOp())
          if (pending == 0) {
            resolve()
          }
        }
      })
    })
    let requested = false;
    while (true) {
      await Promise.all(Object.entries(schedule).filter(([day, classes]) => {
        const equal = day.localeCompare(weekday, [], {
          sensitivity: 'base'
        }) == 0
        if (!equal) {
          console.log(`[${username}] skipping ${day} != ${weekday}`)
        }
        return equal
      }).map(async ([day, classes]) => {
        await Promise.all(Object.entries(classes).sort(([p1, t1], [p2, t2]) => {
          const precedence = [
            'WOD',
            'Barbell Club',
            'Bodybuilding',
            "Competitor's Class",
          ]
          return precedence.indexOf(p1) - precedence.indexOf(p2)
        }).map(async ([program, time]) => {
          const xpath = `//*[@onclick][descendant::*[contains(@class, "icon-calendar") and not(contains(@class, "disabled"))]][ancestor::tr[1][descendant::*[text() = "${program}"] and (preceding-sibling::tr[descendant::*[contains(text(), "DAY")]][1][descendant::*[text() = "${day}"]] and descendant::*[text() = "${time}"])]]`
          const id = `${day}:${program}@${time}`
          while (true) {
            const elements = await instrument(username, `page.$x(${id})`, page.$x(xpath))
            const count = (await Promise.all(elements.map(async (element) => {
              try {
                await instrument(username, `(${id}).click()`, (() => {
                  if (isLocal) {
                    // Fault injection for local testing.
                    if (Math.random() < 0.8) {
                      return Promise.reject(new Error('gotcha'))
                    }
                  }
                  // Click without scrolling; ElementHandle.click scrolls the page before clicking.
                  return element.evaluate((b) => {
                    if (b instanceof HTMLElement) {
                      return b.click()
                    }
                    throw new Error(`${b.className} is not an HTMLElement`)
                  })
                })())
                return true
              } catch (e) {
                if (e instanceof Error) {
                  console.error(`[${username}] (${id}).click(): ${e.message}`)
                } else {
                  throw e
                }
                return false
              }
            }))).filter((value) => value).length
            if (count != 0) {
              requested = true
              pending += count
              console.log(pendingOp())
            }
            if (count != elements.length) {
              continue
            }
            break
          }
        }))
      }))
      if (isLocal || requested) {
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
        instrument(username, 'page.click(reset)', page.click('[value="Reset"]')),
        instrument(username, 'page.wait(Response)', page.waitForResponse(async (response) => {
          if (!response.url().startsWith('https://app.wodify.com/Schedule/CalendarListView.aspx')) {
            return false
          }
          const text = await response.text()
          if (!text.includes('CalendarList.Filter')) {
            return false
          }
          return true
        })),
      ])
    }
    if (requested) {
      await instrument(username, 'page.on(response)', complete)
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

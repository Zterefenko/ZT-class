// TODO:
// - Move settings to pubsub with schema? easier to edit.
/**
 * @typedef {'6:00 PM' | '7:00 PM'} BarbellCore
 * @typedef {'6:00 AM' | '7:00 AM' | '8:00 AM' | '12:00 PM' | '5:00 PM'} WODCore
 * @typedef {{
 *   username: string,
 *   password: string,
 *   classes: {
 *     'Barbell Club'?: {
 *       MONDAY?: BarbellCore,
 *       THURSDAY?: BarbellCore,
 *       SATURDAY?: '12:30 PM',
 *     },
 *     Bodybuilding? : {
 *       TUESDAY?: '4:00 PM',
 *       SUNDAY?: '12:00 PM',
 *     },
 *     "Competitor's Class"? : {
 *       SATURDAY: '8:30 AM'
 *     },
 *     WOD?: {
 *       MONDAY?: '5:00 AM' | WODCore | '4:00 PM' | '8:00 PM',
 *       TUESDAY?:'5:00 AM' | WODCore | BarbellCore | '8:00 PM',
 *       WEDNESDAY?: '5:00 AM' | WODCore | '4:00 PM' | BarbellCore | '8:00 PM',
 *       THURSDAY?: WODCore | '4:00 PM' | '8:00 PM',
 *       FRIDAY?: WODCore | '9:00 AM' | '4:00 PM' | BarbellCore,
 *       SATURDAY?: '9:30 AM' | '10:30 AM' | '11:30 AM',
 *     },
 *   }
 * }[]} settings
 */

exports.default = undefined

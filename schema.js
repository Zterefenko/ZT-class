// TODO:
// - Move settings to pubsub with schema? easier to edit but protocol buffers
//   doesn't have union types (does protoc generate typescript yet?)

/**
 * @typedef {'6:00 PM' | '7:00 PM'} BarbellCore
 * @typedef {'6:00 AM' | '7:00 AM' | '8:00 AM' | '12:00 PM' | '5:00 PM'} WODCore
 * @typedef {{
 *   username: string,
 *   password: string,
 *   schedule: {
 *     MONDAY?: {
 *       WOD?: '5:00 AM' | WODCore | '4:00 PM' | '8:00 PM',
 *       'Barbell Club'?: BarbellCore,
 *     },
 *     TUESDAY?: {
 *       WOD?:'5:00 AM' | WODCore | BarbellCore | '8:00 PM',
 *       Bodybuilding?: '4:00 PM',
 *     },
 *     WEDNESDAY?: {
 *       WOD?: '5:00 AM' | WODCore | '4:00 PM' | BarbellCore | '8:00 PM',
 *     },
 *     THURSDAY?: {
 *       WOD?: WODCore | '4:00 PM' | '8:00 PM',
 *       'Barbell Club'?: BarbellCore,
 *     },
 *     FRIDAY?: {
 *       WOD?: WODCore | '9:00 AM' | '4:00 PM' | BarbellCore,
 *     },
 *     SATURDAY?: {
 *       "Competitor's Class"?: '8:30 AM',
 *       WOD?: '9:30 AM' | '10:30 AM' | '11:30 AM',
 *       'Barbell Club'?: '12:30 PM',
 *     },
 *     SUNDAY?: {
 *       Bodybuilding?: '12:00 PM',
 *     },
 *   },
 * }[]} settings
 */

exports.default = undefined

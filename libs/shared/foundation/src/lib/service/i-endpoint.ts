/**
 * This type is for create custom enpoint on data services that have complex endpoints
 * Usecase
 * {endpoint: 'booking/12u3e-2w5we-r45ty-a67aas'}
 *
 * or
 *
 * {
 *  endpoint: 'facility/:facility/slot/:slotId',
 *  bindings: ['ab34e-5e6we-r45er-w7aas', '45u3t-5y5wu-t65tr-eff5g']
 * }
 */
export interface IEndpoint {
  endpoint: string;
  bindings?: any[];
}

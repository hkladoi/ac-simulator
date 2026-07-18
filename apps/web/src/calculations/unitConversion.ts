export const KW_TO_BTUH = 3412.142;
export const kwToBtuh = (kw: number) => kw * KW_TO_BTUH;
export const btuhToKw = (btuh: number) => btuh / KW_TO_BTUH;
export const metersToFeet = (meters: number) => meters * 3.28084;
export const feetToMeters = (feet: number) => feet / 3.28084;
export const celsiusToFahrenheit = (c: number) => (c * 9) / 5 + 32;
export const fahrenheitToCelsius = (f: number) => ((f - 32) * 5) / 9;

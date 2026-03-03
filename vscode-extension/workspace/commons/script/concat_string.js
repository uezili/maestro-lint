function concatZipCodeAndCountry(zip_code, country) {
	return `${country}, ${zip_code}`;
}

function concatExpirationDate(expiration_date) {
	return `Exp: ${expiration_date}`;
}

function concatCityAndState(city, state) {
	return `${city}, ${state}`;
}

const cityConcat = city;
const stateConcat = state;
const zipCodeConcat = zip_code;
const countryConcat = country;
const expirationDateConcat = expiration_date;

output.zipCodeAndCountryValidation = concatZipCodeAndCountry(
	zipCodeConcat,
	countryConcat
);
output.expirationDateValidation = concatExpirationDate(expirationDateConcat);
output.cityAndStateValidation = concatCityAndState(cityConcat, stateConcat);

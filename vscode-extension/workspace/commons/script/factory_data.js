
function randomName() {
  const firstNames = ["John", "Maria", "Lucas", "Sofia", "Robert"];
  const lastNames = ["Silva", "Pereira", "Johnson", "Brown", "Lee"];
  const first = firstNames[Math.floor(Math.random() * firstNames.length)];
  const last = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${first} ${last}`;
}

function generateAddressLine() {
  const streetNames = ["Manderley", "Oakwood", "Maple", "Pine", "Cedar", "Birch", "Willow"];
  const number = Math.floor(Math.random() * 999) + 1;
  const street = streetNames[Math.floor(Math.random() * streetNames.length)];
  return `${street} ${number}`;
}

function generateCity() {
  const cities = ["Truro", "London", "Manchester", "Bristol", "Liverpool", "Leeds"];
  return cities[Math.floor(Math.random() * cities.length)];
}

function generateState() {
  const states = ["Cornwall", "Devon", "Yorkshire", "Surrey", "Lancashire", "Kent"];
  return states[Math.floor(Math.random() * states.length)];
}

function generateZipCode() {
  return (Math.floor(10000 + Math.random() * 89999)).toString();
}

function generateCountry() {
  const countries = ["United Kingdom", "Ireland", "Scotland", "Wales"];
  return countries[Math.floor(Math.random() * countries.length)];
}

function generateCardNumber() {
  let cardNumber = '4'; 
    for (let i = 0; i < 15; i++) {
    
    let digit = Math.floor(Math.random() * 10);
    cardNumber += digit;
    
    let currentTotalLength = i + 2; 

    if (currentTotalLength % 4 === 0 && currentTotalLength < 16) {
      cardNumber += ' ';
    }
  }
  return cardNumber;
}

function generateExpiryDate() {
  const currentYear = new Date().getFullYear() % 100;
  const randomMonth = Math.floor(Math.random() * 12) + 1;
  const randomYear = Math.floor(Math.random() * 5) + currentYear + 1;

  const monthString = String(randomMonth).padStart(2, '0');
  const yearString = String(randomYear).slice(-2);
  return `${monthString}/${yearString}`;
}

function generateSecurityCode() {
  return (Math.floor(100 + Math.random() * 899)).toString();
}


output.RANDOM_FULLNAME = randomName();
output.RANDOM_ADDRESS_LINE = generateAddressLine();
output.RANDOM_CITY = generateCity();
output.RANDOM_STATE = generateState();
output.RANDOM_ZIP_CODE = generateZipCode();
output.RANDOM_COUNTRY = generateCountry();
output.CARD_NUMBER = generateCardNumber();
output.EXPIRATION_DATE = generateExpiryDate();
output.SECURITY_CODE = generateSecurityCode();
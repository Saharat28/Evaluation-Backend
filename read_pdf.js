const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('c:/Users/bassa/OneDrive/Desktop/pro2/เกณฑ์การตรวจงาน-สมรรถนะที่1.pdf');

pdf(dataBuffer).then(function (data) {
    console.log(data.text);
}).catch(function (error) {
    console.error(error);
});

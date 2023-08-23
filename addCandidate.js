const { Builder, By, Key, until, Select } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const path = require("path");
const fs = require("fs");
const readline = require("readline");
const chromePath = path.join(__dirname, "drivers", "chromedriver");

const options = new chrome.Options();
options.addArguments("--start-maximized");

const driver = new Builder()
  .forBrowser("chrome")
  .setChromeOptions(options)
  .build();

async function waitForElement(selector, timeout = 1000) {
  try {
    let element = await driver.wait(
      until.elementLocated(By.css(selector)),
      timeout
    );
    return element;
  } catch (error) {
    console.log(`Phần tử không tồn tại sau ${timeout}ms:`, error.message);
    return null;
  }
}

// Hàm đăng nhập
async function login(username, password) {
  await driver.get(
    "http://localhost/orangehrm-4.5/symfony/web/index.php/auth/login"
  );

  const usernameInput = await waitForElement("#txtUsername");
  await usernameInput.sendKeys(username);

  const passwordInput = await waitForElement("#txtPassword");
  await passwordInput.sendKeys(password);

  const loginButton = await waitForElement("#btnLogin");
  await loginButton.click();

  const successMessage = await waitForElement("#welcome");
  const message = await successMessage.getText();
  console.log("Login status:", message);
}

async function executeTest() {
  await login("admin", "10072002@Aw");
  const dataPath = path.join(__dirname, "data/addCandidate.csv");
  const resultPath = path.join(__dirname, "data/addCandidate-result.csv");

  const dataFile = fs.createReadStream(dataPath);
  const resultFile = fs.createWriteStream(resultPath);
  const headerResult = "TC;Input;Expected output;Actual output\n";
  resultFile.write(headerResult);

  const lineReader = readline.createInterface({
    input: dataFile,
    crlfDelay: Infinity,
  });

  let index = 1;
  let isFirstLine = true;
  let isPass = true;

  for await (const line of lineReader) {
    if (isFirstLine) {
      isFirstLine = false;
      continue;
    }
    let msgResult = "";
    const values = line.split(",");
    console.log(values[0], values[1], values[2], values[3], values[4]);
    // console.log("value 7", values[7]);

    const result = [];
    result.push(
      `#${index};${values[0]}|${values[1]}|${values[2]}|${values[3]}|${values[4]}|${values[5]}|${values[6]}|${values[7]}|${values[8]}|${values[9]};${values[10]};${values[11]}`
    );
    console.log("result", result);
    await driver
      .findElement(By.css("#menu_recruitment_viewRecruitmentModule > b"))
      .click();
    await driver.findElement(By.id("menu_recruitment_viewCandidates")).click();
    // await driver.findElement(By.id("menu_admin_workShift")).click();
    await driver.findElement(By.css("#btnAdd")).click();

    await driver
      .findElement(By.id("addCandidate_firstName"))
      .sendKeys(`${values[0]}`);
    await driver
      .findElement(By.id("addCandidate_middleName"))
      .sendKeys(`${values[1]}`);
    await driver
      .findElement(By.id("addCandidate_lastName"))
      .sendKeys(`${values[2]}`);
    await driver
      .findElement(By.id("addCandidate_email"))
      .sendKeys(`${values[3]}`);
    await driver
      .findElement(By.id("addCandidate_contactNo"))
      .sendKeys(`${values[4]}`);

    if (values[5] != "") {
      console.log("cjeck job title");
      const jobTitleElement = await driver.findElement(
        By.id("addCandidate_vacancy")
      );
      const jobTitle = new Select(jobTitleElement);
      await jobTitle.selectByVisibleText(`${values[5]}`);
    }
    // 6 là filename
    await driver
      .findElement(By.id("addCandidate_keyWords"))
      .sendKeys(`${values[7]}`);
    await driver
      .findElement(By.id("addCandidate_comment"))
      .sendKeys(`${values[8]}`);
    await driver.findElement(By.id("btnSave")).click();
    await driver.sleep(100);
    // return 0;
    let firstNameMsg = await driver.findElements(
      By.css(
        "#frmAddCandidate > fieldset > ol:nth-child(1) > li.line.nameContainer > ol > li:nth-child(1) > span"
      )
    );

    if (firstNameMsg) {
      for (let i = 0; i < firstNameMsg.length; i++) {
        let text = await firstNameMsg[i].getText();
        if (text == undefined) break;
        if (msgResult != "") msgResult += "|";
        msgResult = msgResult + "Input firstname: " + text;
        break;
        // result.push("Input jobTitle: " + text);
      }
    }
    console.log("msgResult", msgResult);
    let lastNameMsg = await driver.findElements(
      By.css(
        "#frmAddCandidate > fieldset > ol:nth-child(1) > li.line.nameContainer > ol > li:nth-child(3) > span"
      )
    );

    if (lastNameMsg) {
      for (let i = 0; i < lastNameMsg.length; i++) {
        let text = await lastNameMsg[i].getText();
        if (text == undefined) break;
        console.log("lastNameMsg", i, ":", text);
        if (msgResult != "") msgResult += "|";
        msgResult = msgResult + "Input lastName: " + text;
      }
    }
    let emailMsg = await driver.findElements(
      By.css(
        "#frmAddCandidate > fieldset > ol:nth-child(1) > li:nth-child(2) > span"
      )
    );

    if (emailMsg) {
      for (let i = 0; i < emailMsg.length; i++) {
        let text = await emailMsg[i].getText();
        if (text == undefined) break;
        console.log("emailMsg", i, ":", text);
        if (msgResult != "") msgResult += "|";
        msgResult = msgResult + "Input email: " + text;
      }
    }
    let contactNoMsg = await driver.findElements(
      By.css(
        "#frmAddCandidate > fieldset > ol:nth-child(1) > li:nth-child(3) > span"
      )
    );

    if (contactNoMsg) {
      for (let i = 0; i < contactNoMsg.length; i++) {
        let text = await contactNoMsg[i].getText();
        if (text == undefined) break;
        console.log("contactNoMsg", i, ":", text);
        if (msgResult != "") msgResult += "|";
        msgResult = msgResult + "Input email: " + text;
      }
    }

    if (msgResult == "") msgResult = "saved successfully";
    result.push(msgResult);

    isPass = true;
    index++;
    const resultString = result.join(";");
    resultFile.write(resultString + "\n");
  }

  console.log("index", index);
  resultFile.end();
}

async function runTest() {
  try {
    await driver.manage().window().maximize();
    await executeTest();
    // await driver.sleep(100);
  } finally {
    await driver.quit();
  }
}

runTest();

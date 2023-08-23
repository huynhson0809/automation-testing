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
  const dataPath = path.join(__dirname, "data/addJobVacancy.csv");
  const resultPath = path.join(__dirname, "data/addJobVacancy-result.csv");

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
      `#${index};${values[0]}|${values[1]}|${values[2]}|${values[3]}|${values[4]};${values[5]}`
    );
    console.log("result", result);
    await driver
      .findElement(By.css("#menu_recruitment_viewRecruitmentModule > b"))
      .click();
    await driver.findElement(By.id("menu_recruitment_viewJobVacancy")).click();
    // await driver.findElement(By.id("menu_admin_workShift")).click();
    await driver.findElement(By.css("#btnAdd")).click();
    await driver.sleep(1000);
    if (values[0] != "") {
      console.log("cjeck job title");
      const jobTitleElement = await driver.findElement(
        By.id("addJobVacancy_jobTitle")
      );
      const jobTitle = new Select(jobTitleElement);
      await jobTitle.selectByVisibleText(`${values[0]}`);
    }
    if (values[1] != "") {
      await driver
        .findElement(By.id("addJobVacancy_name"))
        .sendKeys(`${values[1]}`);
    }
    if (values[2] != "") {
      const managerE = await driver.findElement(
        By.id("addJobVacancy_hiringManager")
      );
      managerE.clear();
      await managerE.sendKeys(`${values[2]}`);
      await managerE.sendKeys(Key.ENTER);
    }
    await driver
      .findElement(By.id("addJobVacancy_noOfPositions"))
      .sendKeys(`${values[3]}`);
    await driver
      .findElement(By.id("addJobVacancy_description"))
      .sendKeys(`${values[4]}`);
    await driver.findElement(By.id("btnSave")).click();
    await driver.sleep(2000);
    // return 0;

    let jobTitleMsg = await driver.findElements(
      By.css("#frmAddJobVacancy > fieldset > ol > li:nth-child(1) > span")
    );

    if (jobTitleMsg) {
      for (let i = 0; i < jobTitleMsg.length; i++) {
        let text = await jobTitleMsg[i].getText();
        text += console.log("jobTitleMsg", i, ":", text);
        if (msgResult != "") msgResult += "|";
        msgResult = msgResult + "Input jobTitle: " + text;
        // result.push("Input jobTitle: " + text);
      }
    }

    let vacancyNameMsg = await driver.findElements(
      By.css("#frmAddJobVacancy > fieldset > ol > li:nth-child(2) > span")
    );

    if (vacancyNameMsg) {
      for (let i = 0; i < vacancyNameMsg.length; i++) {
        let text = await vacancyNameMsg[i].getText();
        console.log("vacancyNameMsg", i, ":", text);
        if (msgResult != "") msgResult += "|";
        msgResult = msgResult + "Input vacancyName: " + text;
      }
    }
    let managerMsg = await driver.findElements(
      By.css("#frmAddJobVacancy > fieldset > ol > li:nth-child(3) > span")
    );

    if (managerMsg) {
      for (let i = 0; i < managerMsg.length; i++) {
        let text = await managerMsg[i].getText();
        console.log("managerMsg", i, ":", text);
        if (msgResult != "") msgResult += "|";
        msgResult = msgResult + "Input manager: " + text;
      }
    }
    let numPosMsg = await driver.findElements(
      By.css("#frmAddJobVacancy > fieldset > ol > li:nth-child(4) > span")
    );

    if (numPosMsg) {
      for (let i = 0; i < numPosMsg.length; i++) {
        let text = await numPosMsg[i].getText();
        console.log("numPosMsg", i, ":", text);
        if (msgResult != "") msgResult += "|";
        msgResult = msgResult + "Input numPos: " + text;
      }
    }
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

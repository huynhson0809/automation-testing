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
  const dataPath = path.join(__dirname, "data/addWorkShift.csv");
  const resultPath = path.join(__dirname, "data/addWorkShift-result.csv");

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
    const values = line.split(",");
    console.log(values[0], values[1], values[2], values[3], values[4]);
    // console.log("value 7", values[7]);

    const result = [];
    result.push(
      `#${index};${values[0]}|${values[1]}|${values[2]}|${values[3]};${values[4]}`
    );
    console.log("result", result);
    await driver.findElement(By.css("#menu_admin_viewAdminModule > b")).click();
    await driver.findElement(By.id("menu_admin_Job")).click();
    await driver.findElement(By.id("menu_admin_workShift")).click();
    await driver.findElement(By.css("#btnAdd")).click();

    await driver.sleep(100)
    const jobTitleElement = await driver.findElement(By.css("#workShift_name"));
    // jobTitleElement.clear();
    jobTitleElement.sendKeys(`${values[0]}`);

    const selectElementFrom = await driver.findElement(
      By.css("#workShift_workHours_from")
    );

    const selectFrom = new Select(selectElementFrom);
    await selectFrom.selectByVisibleText(`${values[1]}`);workShift_name

    const selectElementTo = await driver.findElement(
      By.css("#workShift_workHours_to")
    );
    const selectTo = new Select(selectElementTo);
    await selectTo.selectByVisibleText(`${values[2]}`);

    if (values[3] != "") {
      const selectElementAvailable = await driver.findElement(
        By.css("#workShift_availableEmp")
      );
      const selectAvailable = new Select(selectElementAvailable);
      await selectAvailable.selectByVisibleText(`${values[3]}`);

      await driver.findElement(By.id("btnAssignEmployee")).click();
      await driver.sleep(200);
    }
    await driver.findElement(By.id("btnSave")).click();
    console.log("check index", index);
    let shiftMessage = await driver.findElements(
      By.css("#frmWorkShift > fieldset > ol > li:nth-child(1) > span")
    );
    if (shiftMessage) {
      for (let i = 0; i < shiftMessage.length; i++) {
        let text = await shiftMessage[i].getText();
        console.log("shiftMessage", i, ":", text);
        result.push("Input shif name: " + text);
      }
    }

    let timeMsg = "";
    try {
      let isValidateFile = await waitForElement(
        "#frmWorkShift > fieldset > ol > li:nth-child(2) > span"
      );
      if (isValidateFile) {
        console.log("CHEKC");
        // await driver.get("http://localhost/orangehrm-4.5/");
        let text = await isValidateFile.getText();
        timeMsg = text;
        console.log("isSuccess:", text);
        if (!isPass) {
          result.push(text);
        }
      }
    } catch (error) {
      console.log("Phần tử không tồn tại:", error.message);
    }

    isPass = true;
    await driver.sleep(100);
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

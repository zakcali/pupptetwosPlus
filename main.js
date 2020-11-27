const electron = require('electron')
const puppeteer = require('puppeteer-core')
const os = require('os');
const platform = os.platform();

var options     = {
  headless: false,
  defaultViewport: null,
  args: [
//	'--start-maximized',
	'--ignoreHTTPSErrors', //to really tick "Citation indexes"
	'--window-size=1366,768'
  ],
}

if(platform == "linux"){
    options.executablePath = "/usr/bin/google-chrome"
}else if(platform == "darwin"){
    options.executablePath = "/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome"
} else if(platform == "win32"){
	options.executablePath = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
}
const { app, BrowserWindow, shell } = require('electron')

function createWindow () {
  // Create the browser window.
  let win = new BrowserWindow({
    width: 850,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
	  nativeWindowOpen: true
    }

  })

  // and load the index.html of the app.
  win.loadFile('index.html')
  win.webContents.on('new-window', (event, url, frameName, disposition, options, additionalFeatures) => {
  if (frameName === 'modal') {

    // open window as modal
    event.preventDefault()
    Object.assign(options, {
      modal: true,
      parent: win,
	  title: 'Print area',
    })
    let modalWin=new BrowserWindow(options)
    event.newGuest = modalWin
    modalWin.webContents.on('new-window', function(e, url) {
  	e.preventDefault();
  	shell.openExternal(url);
});

  }
})
}

app.whenReady().then(createWindow)
var browser = null
var linkSearch = null  
var	firstSearch = true // tick SCI, SSCI, AHCI once a Chrome session
var pages = null
var page = null
var disconnected = false
const selectorBox = '.Adv_formBoxesSearch'
const selectorView = 'a[title="Click to view the results"]'

const wosurl = 'https://apps.webofknowledge.com'
const advurl = 'https://apps.webofknowledge.com/WOS_AdvancedSearch_input.do?product=WOS&search_mode=AdvancedSearch'

global.makeSearch = function(advtext) {
const queryText=advtext; // important to be able to paste instead of typing !!! https://stackoverflow.com/questions/47966510/how-to-fill-an-input-field-using-puppeteer
try {
  (async () => {
	  if (browser == null || disconnected == true) {
	browser = await puppeteer.launch(options)
	disconnected = false // to prevent opening a new window for each query
	firstSearch = true // to tick SCI, SSCI, and AHCI again
	pages = await browser.pages()
	page = pages[0]
//	await page.setViewport({ width: 1366, height: 768 })
	await page.goto(wosurl, {waitUntil: 'networkidle2'}).catch(e => {
            console.error('WOS URL unreachable!');
            process.exit(2);
        })
	browser.on('disconnected',async()=>{
    disconnected = true;
    })

	}
	 
	linkSearch = await page.$('a[title="Use Advanced Search to Narrow Your Search to Specific Criteria"]')
	if (linkSearch)    {
		await linkSearch.click()
	if (firstSearch) // tick SCI, SSCI, AHCI once
	{
	firstSearch = false // don't tick // tick SCI, SSCI, AHCI anymore
	// show indexes
	await page.waitForSelector('#settings-arrow');   
	await page.click('#settings-arrow'); 
	// uncheck all indexes 
	await page.$$eval("input[type='checkbox']", checks => checks.forEach(c => c.checked = false))
	// check first three
	await page.$eval('input[id="editionitemSCI"]', check => check.checked = true)
	await page.$eval('input[id="editionitemSSCI"]', check => check.checked = true)
	await page.$eval('input[id="editionitemAHCI"]', check => check.checked = true)
	
	//remember checks, do not use await !!!
	page.evaluate(() => {
		saveForm('WOS_AdvancedSearch_input_form')
		});
	//hide indexes
	await page.waitForSelector('#settings-arrow');   
	await page.click('#settings-arrow');
	}
		await page.waitForSelector(selectorBox);
		await page.evaluate(selectorBox => {document.querySelector(selectorBox).value = "";}, selectorBox); // clear text area
		await page.$eval(selectorBox, (el,value) => el.value = value, queryText);
//		await page.type(selectorBox, advtext) // slooow use above line
		await page.click('#search-button')
		await page.waitForNavigation({waitUntil: 'networkidle2'});
		if ((await page.$('#noRecordsDiv')) == null) { //if search found records
			await page.waitForSelector(selectorView);
			await page.click(selectorView)
		}

		
	}
	linkSearch = await page.$('a[title="Back to Search"]')
		if (linkSearch)    {
		page.goto(advurl) // either this, or below
//		await link.click()
		await page.waitForSelector(selectorBox);
		await page.evaluate(selectorBox => {document.querySelector(selectorBox).value = "";}, selectorBox); // clear text area
		await page.$eval(selectorBox, (el,value) => el.value = value, queryText);
//		await page.type(selectorBox, advtext) // sloow use above line
		await page.click('#search-button')
		await page.waitForNavigation({waitUntil: 'networkidle2'});
		if ((await page.$('#noRecordsDiv')) == null) { //if search found records
			await page.waitForSelector(selectorView);
			await page.click(selectorView)
		}
		}
	linkSearch = await page.$('div[title="Back to previous page"]')
		if (linkSearch)    {
		page.goto(advurl)
		await page.waitForSelector(selectorBox);
		await page.evaluate(selectorBox => {document.querySelector(selectorBox).value = "";}, selectorBox); // clear text area
		await page.$eval(selectorBox, (el,value) => el.value = value, queryText);
//		await page.type(selectorBox, advtext) // sloow use above line
		await page.click('#search-button')
		await page.waitForNavigation({waitUntil: 'networkidle2'});
		if ((await page.$('#noRecordsDiv')) == null) { //if search found records
			await page.waitForSelector(selectorView);
			await page.click(selectorView)
		}

		}
  })()
} catch (err) {
  console.error(err)
}

}

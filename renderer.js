var Papa = require('papaparse');
const { ipcRenderer } = require('electron')
// let {remote} = require('electron');
const soap = require ('soap');
const fs = require('fs');
var nodeConsole = require('console');
var myConsole = new nodeConsole.Console(process.stdout, process.stderr);
const auth_url = 'http://search.webofknowledge.com/esti/wokmws/ws/WOKMWSAuthenticate?wsdl';
const search_url = 'http://search.webofknowledge.com/esti/wokmws/ws/WokSearchLite?wsdl';
const preArticle= 'https://gateway.webofknowledge.com/gateway/Gateway.cgi?GWVersion=2&SrcApp=Publons&SrcAuth=Publons_CEL&KeyUT=';
const postArticle = '&DestLinkType=FullRecord&DestApp=WOS_CPL';
const preCitation = 'https://gateway.webofknowledge.com/gateway/Gateway.cgi?GWVersion=2&SrcApp=Publons&SrcAuth=Publons_CEL&KeyUT=';
const postCitation = '&DestLinkType=CitingArticles&DestApp=WOS_CPL';
const preDoi='https://doi.org/';
var wosq1List = wosq2List = wosq3List = wosq4List = []; //if you know publications Quartile values, you don't need to issn/eissn list
var eissnq1List = eissnq2List = eissnq3List = eissnq4List = eissnahList = []; 
var issnq1List = issnq2List = issnq3List = issnq4List = issnahList = []; 

let wSID = '';
var countLimit=0;  // 0=> there is no limit
var printToScreen=true;
var pubArray= [];
var arrayLength=0;
var filteredLength=0;

//let advText = 'AI=U-7339-2017';
let advText = 'OG=(Baskent University)'
//let advText= 'AD=(harvard univ SAME Med*) '
let sortField = 'PY'; // AU= author, PY=Publication year, TC=Times cited, SO=Source, CW=Source, LD=Load date
let sortOrder = 'D'; // A=ascending, D=descending
let timespanBegin='2020-01-01';
let timespanEnd='2030-12-31';

var editions = [];

var queryT = [];
var academics = [[],[]];
var rid; // researcherId
var orcid; // ORCID
const myUni = ' AND OG=(Baskent University)'
const baseUrl='http://xxx.yyy.edu.tr/zzz/';
const depList = document.querySelector ('#selectDepartment');
const acadList = document.querySelector ('#selectAcademician');
const clearBtn = document.querySelector ('#deleteAcad');
const retrieveBtn = document.querySelector ('#retrieveBtn');
const printBtn = document.querySelector ('#printBtn');
const gotoWOSBtn = document.querySelector ('#gotoWOS');
const toBoxBtn = document.querySelector ('#toBoxBtn');
const queryArea= document.querySelector('#advSearch');
const year1Text= document.querySelector('#year1');
const month1Text= document.querySelector('#month1');
const day1Text= document.querySelector('#day1');
const year2Text= document.querySelector('#year2');
const month2Text= document.querySelector('#month2');
const day2Text= document.querySelector('#day2');
const sortFieldRadio = document.getElementsByName('sortfield');
const sortOrderRadio = document.getElementsByName('sortorder');
const progressBar = document.querySelector('#bar');
const flagissnDict = document.querySelector ('#flagissnDict');
const flagWOSDict = document.querySelector ('#flagWOSDict');
flagissnDict.addEventListener('change', () => {
	printBtn.disabled=true;
	toBoxBtn.disabled=true;
});
flagWOSDict.addEventListener('change', () => {
	printBtn.disabled=true;
	toBoxBtn.disabled=true;
});

depList.addEventListener('change', () => {
copyQueryText(depList.options[depList.selectedIndex].value);
});
acadList.addEventListener('change', () => {
copyAcademician()
});
clearBtn.addEventListener('click', () => {
clearAcademician()
});
gotoWOSBtn.addEventListener('click', async ()  => {
// https://medium.com/@nornagon/electrons-remote-module-considered-harmful-70d69500f31
// https://www.electronjs.org/docs/api/ipc-main
const ipcresult = await ipcRenderer.invoke('makeSearch', queryArea.value); 
});
retrieveBtn.addEventListener('click', () => {
retrieveArt()
});
printBtn.addEventListener('click', () => {
createPrintWindow()
});
toBoxBtn.addEventListener('click', () => {
copyToBox()
});

///////////////////// retrieve begins here /////////////////////////////////////
async function retrieveArt() {
advText=queryArea.value;
if (advText==='') {
	alert ('Arama metni boş');
	return 'Query Text is empty';}
printBtn.disabled=true;
retrieveBtn.disabled=true;
toBoxBtn.disabled=true;
progressBar.style.width = (0)+ "%";

for (var s = 0; s < sortFieldRadio.length; s++) {
     if (sortFieldRadio[s].checked) sortField=sortFieldRadio[s].value;
    }

for (var s = 0; s < sortOrderRadio.length; s++) {
     if (sortOrderRadio[s].checked) sortOrder=sortOrderRadio[s].value;
    }

myConsole.log (sortField, sortOrder)

let year1=month1=day1=year2=month2=day2='';
let y=0; 
if (year1Text.value !=='') {year1=year1Text.value; y++; }
	else {year1='1968';}
if (month1Text.value !=='') {month1=month1Text.value; y++; }
	else {month1='01'; }
if (day1Text.value !=='') {day1=day1Text.value; y++; }
	else {day1='01'; }
if (y==0) {timespanBegin='1968-01-01';} 
	else {timespanBegin=year1+"-"+month1+"-"+day1;}
y=0; 
if (year2Text.value !=='') {year2=year2Text.value; y++; }
	else {year2='2030'; }
if (month2Text.value !=='') {month2=month2Text.value; y++; }
	else {month2='12'; }
if (day2Text.value !=='') {day2=day2Text.value; y++; }
	else {day2='31'; }
if (y==0) {timespanEnd='2030-12-31';} 
	else {timespanEnd= year2+"-"+month2+"-"+day2;}

myConsole.log(timespanBegin,timespanEnd )

getSid()
.then(result1 => {return retrieveArticles();})
.then(result2 => {printBtn.disabled=false; toBoxBtn.disabled=false;}) // you have all articles in pubArray, do whatever you want here
.catch(error => {alert(error.message);
}) // display error obtained from WOS server to the user
.finally ( ()=> {retrieveBtn.disabled=false; })
}

function copyToBox() {
if (arrayLength > 0 ) {
longWOStext='UT=(';
for (k=0; k<arrayLength; k++) {
///////////////////////// display/skip filters ////////////////////////////
let q1q4ah = pubArray[k][12];
let skipThis = true;
if (document.querySelector('#flagQ1').checked && (q1q4ah === 'Q1')) 
	{skipThis=false;}
if (document.querySelector('#flagQ2').checked && (q1q4ah === 'Q2'))
	{skipThis=false;}
if (document.querySelector('#flagQ3').checked && (q1q4ah === 'Q3'))
	{skipThis=false;}
if (document.querySelector('#flagQ4').checked && (q1q4ah === 'Q4'))
	{skipThis=false;}
if (document.querySelector('#flagQx').checked && (q1q4ah === 'Q?'))
	{skipThis=false;}
if (document.querySelector('#flagAH').checked && (q1q4ah === 'AH'))
	{skipThis=false;}
if (skipThis) {
	continue;}
skipThis = true;
let arty = pubArray[k][18];
if (document.querySelector('#flagarticles').checked && (arty ==='Article')) 
	{skipThis=false;}
if (document.querySelector('#flagnonarticles').checked && (arty !='Article')) 
	{skipThis=false;}
if (skipThis) {
	continue;}

///////////////////////// display/skip filters ////////////////////////////

longWOStext = longWOStext+' '+ pubArray[k][9]+' OR';
	}
if	(longWOStext.endsWith('OR')) {
	longWOStext=longWOStext.slice(0, -2);
		}
	longWOStext=longWOStext+')';
queryArea.value=longWOStext;
	}	
}

function createPrintWindow() {
const modal = window.open('', 'modal', 'width=1024, height=750, scrollbars=yes, top=200, left=20')
let filtered =[];
modal.document.write('<hr>')
modal.document.write('Between '+timespanBegin, ' and ', timespanEnd, ', number of articles indexed in Web of Science Collections you searched for are: ', arrayLength);
modal.document.write('<hr>')
for (k=0; k<arrayLength; k++) {
///////////////////////// display/skip filters ////////////////////////////
let q1q4ah = pubArray[k][12];
let skipThis = true;
if (document.querySelector('#flagQ1').checked && (q1q4ah === 'Q1')) 
	{skipThis=false;}
if (document.querySelector('#flagQ2').checked && (q1q4ah === 'Q2'))
	{skipThis=false;}
if (document.querySelector('#flagQ3').checked && (q1q4ah === 'Q3'))
	{skipThis=false;}
if (document.querySelector('#flagQ4').checked && (q1q4ah === 'Q4'))
	{skipThis=false;}
if (document.querySelector('#flagQx').checked && (q1q4ah === 'Q?'))
	{skipThis=false;}
if (document.querySelector('#flagAH').checked && (q1q4ah === 'AH'))
	{skipThis=false;}
if (skipThis) {
	continue;}
skipThis = true;
let arty = pubArray[k][18];
if (document.querySelector('#flagarticles').checked && (arty ==='Article')) 
	{skipThis=false;}
if (document.querySelector('#flagnonarticles').checked && (arty !='Article')) 
	{skipThis=false;}
if (skipThis) {
	continue;}

///////////////////////// display/skip filters ////////////////////////////
let publicationLine='';
publicationLine = publicationLine
+pubArray[k][0]
+pubArray[k][1]+'.'+'&nbsp;'
+pubArray[k][2]+'&nbsp;'
+pubArray[k][3]+';'
+pubArray[k][4]
+pubArray[k][5]
+pubArray[k][6]
+pubArray[k][7]+','
if (document.querySelector('#articletype').checked) {
	publicationLine=publicationLine+'&nbsp;'+pubArray[k][8]+',';
		}
if (document.querySelector('#WOSno').checked) {
	publicationLine=publicationLine+'&nbsp;'+pubArray[k][9]+',';
		}
if (document.querySelector('#nofauthors').checked) {
	publicationLine=publicationLine+ '&nbsp;'+'Yazar sayısı='+pubArray[k][11]+','
		}
if (pubArray[k][10] !=='')
	{ publicationLine=publicationLine+'&nbsp;'+'doi='+pubArray[k][10]+',';}
if (document.querySelector('#prQH').checked) {
	publicationLine=publicationLine+'&nbsp;'+pubArray[k][12]+',';}
if (document.querySelector('#prlinks').checked && pubArray[k][10] !=='') { // Print record numbers
	publicationLine=publicationLine+'&nbsp;'+'<a href="'+pubArray[k][13]+'" target="_blank">'+'DOI:'+pubArray[k][10]+'</a>'+','
}
if (document.querySelector('#prlinks').checked) { 
	publicationLine=publicationLine+'&nbsp;'+'<a href="' + pubArray[k][14] + '" target="_blank">' +pubArray[k][9]+ '</a>'+','
	publicationLine=publicationLine+'&nbsp;'+'<a href="' + pubArray[k][15] + '" target="_blank">WOS da atıflar</a>'+',' // this is the last item
	}

if	(publicationLine.endsWith(',')) {
	publicationLine=publicationLine.slice(0, -1);
		}
 if (document.querySelector('#publonslink').checked) { //print only wos-link
	publicationLine=pubArray[k][14];
	}

if (printToScreen==true){

	filtered.push(publicationLine)
		}
}
modal.document.write('number of filtered articles you searched for are: ', filtered.length);
modal.document.write('<hr>')
filteredLength=filtered.length
for (fp=0; fp<filteredLength; fp++){
	if (document.querySelector('#publonslink').checked) {
		modal.document.write(filtered[fp]);
		modal.document.write('<br/>')
		continue; // don't write article number
	}
	if (document.querySelector('#prrecnum').checked == true) {
		filtered[fp]= "<b>"+(fp+1)+'- '+ "</b>"+filtered[fp];
		}
	modal.document.write(filtered[fp]);
	modal.document.write('<hr>')
	}
}

function copyQueryText(chosen) {
	let i= Number (chosen);
	queryArea.value=queryT[i];
//	remote.getGlobal("makeSearch")(queryT[i]);
}

function copyAcademician() {
// check if only university addressed publications of an academician to be searched
var checkBox = document.querySelector('#exclusiveUni'); 
for (let i=0;i<academics.length;i++) {
let acad = academics[i][2] + " "+ academics[i][3] + ", " + academics[i][4] + ", " + academics[i][5];
		if (acad == acadList.value) 		
		{ currentAcad = i;
		rid = academics[i][7];
		orcid = academics[i][9];
		if (rid == '' && orcid == '') {
		queryArea.value = '' // delete previous query if exists
		break;	}
		else if (rid != '' && orcid =='')  // if there is an researchId
			ridQuery='(AI='+rid+')'
		else if (rid == '' && orcid != '')  // if there is an orcid
			ridQuery='(AI='+orcid+')'
		else if (rid != '' && orcid != '')  // if there are both researchId and orcid
			ridQuery='(AI='+orcid+ ' OR AI='+rid+')'
			
		if (checkBox.checked == true){
			ridQuery=ridQuery+myUni;
					} 
			queryArea.value = ridQuery; 
//			remote.getGlobal("makeSearch") (ridQuery);
			
		break; }
		}
}

function clearAcademician() {
	acadList.value = "";
	acadList.focus();
}

function openWOSw (){
	let copyText = queryArea.value;
	if (copyText != '') remote.getGlobal("makeSearch") (copyText) 
}

window.onload = async function() { 
	
let csvurl= baseUrl+'department-list.csv'; // from server
let response = await fetch (csvurl);
let depCSV = await response.text();
let results = Papa.parse(depCSV, {	//parse from csv text
	skipEmptyLines: true
});
var selectList = depList;
 for (var i = 0; i < results.data.length; i++) {
	if (results.data[i][0] != 'Department') { // Papa sometimes skips first (header) row, sometimes not, be sure to skip !
		var option = document.createElement("option");
		option.value = i; 
		option.text = results.data[i][0]; // department name
		selectList.appendChild(option); 
		queryT[i] = results.data[i][1]; // query text
			}
		}
csvurl= baseUrl+'author-list.csv'; // from server
response = await fetch (csvurl);
academicsCSV = await response.text();
academicResults = Papa.parse(academicsCSV, {	//parse from csv text
	skipEmptyLines: true
});
academics = academicResults.data; // Merkez
var aacadList = document.querySelector ('#academicians');		// doesn't accept acadList, I don't know why??
for (let i = 0; i < academics.length; i++) {
		if (academicResults.data[i][0] != 'Merkez' && academicResults.data[i][0] != 'City') { // Papa sometimes skips first (header) row, sometimes not, be sure to skip !
		let option = document.createElement("option");
		option.value = academics[i][2] + " "+ academics[i][3] + ", " + academics[i][4] + ", " + academics[i][5]; // ad, soyad, ABD, BD
		aacadList.appendChild(option); 
		}
	}
gotoWOSBtn.disabled=false;
// read quartile files
let response1 = await fetch (baseUrl+'eissnq1.txt');
let data1 = await response1.text();
eissnq1List = data1.toString().replace(/[^\x00-\x7F]/g,'').replace(/\r/g, '').split("\n"); // remove BOM. Remove '\r', because on windows, newline = '\r\n'

let response2 = await fetch (baseUrl+'eissnq2.txt');
let data2 = await response2.text();
eissnq2List = data2.toString().replace(/[^\x00-\x7F]/g,'').replace(/\r/g, '').split("\n"); 

let response3 = await fetch (baseUrl+'eissnq3.txt');
let data3 = await response3.text();
eissnq3List = data3.toString().replace(/[^\x00-\x7F]/g,'').replace(/\r/g, '').split("\n"); 

let response4 = await fetch (baseUrl+'eissnq4.txt');
let data4 = await response4.text();
eissnq4List = data4.toString().replace(/[^\x00-\x7F]/g,'').replace(/\r/g, '').split("\n"); 

let response5 = await fetch (baseUrl+'eissnahci.txt');
let data5 = await response5.text();
eissnahList = data5.toString().replace(/[^\x00-\x7F]/g,'').replace(/\r/g, '').split("\n"); 

let response6 = await fetch (baseUrl+'issnq1.txt');
let data6 = await response6.text();
issnq1List = data6.toString().replace(/[^\x00-\x7F]/g,'').replace(/\r/g, '').split("\n"); 

let response7 = await fetch (baseUrl+'issnq2.txt');
let data7 = await response7.text();
issnq2List = data7.toString().replace(/[^\x00-\x7F]/g,'').replace(/\r/g, '').split("\n"); 

let response8 = await fetch (baseUrl+'issnq3.txt');
let data8 = await response8.text();
issnq3List = data8.toString().replace(/[^\x00-\x7F]/g,'').replace(/\r/g, '').split("\n"); 

let response9 = await fetch (baseUrl+'issnq4.txt');
let data9 = await response9.text();
issnq4List = data9.toString().replace(/[^\x00-\x7F]/g,'').replace(/\r/g, '').split("\n"); 

let response10 = await fetch (baseUrl+'issnahci.txt');
let data10 = await response10.text();
issnahList = data10.toString().replace(/[^\x00-\x7F]/g,'').replace(/\r/g, '').split("\n"); 
// read quartile dictionaries exatly matches with WOS numbers
let response11 = await fetch (baseUrl+'wosq1.txt');
let data11 = await response11.text();
wosq1List = data11.toString().replace(/[^\x00-\x7F]/g,'').replace(/\r/g, '').split("\n"); 

let response12 = await fetch (baseUrl+'wosq2.txt');
let data12 = await response12.text();
wosq2List = data12.toString().replace(/[^\x00-\x7F]/g,'').replace(/\r/g, '').split("\n"); 

let response13 = await fetch (baseUrl+'wosq3.txt');
let data13 = await response13.text();
wosq3List = data13.toString().replace(/[^\x00-\x7F]/g,'').replace(/\r/g, '').split("\n"); 

let response14 = await fetch (baseUrl+'wosq4.txt');
let data14 = await response14.text();
wosq4List = data14.toString().replace(/[^\x00-\x7F]/g,'').replace(/\r/g, '').split("\n"); 


retrieveBtn.disabled=false;

} // end of window.onload

async function getSid (){
if (wSID === '') { 	// get SID if already not obtained
	const client = await soap.createClientAsync(auth_url);
	const response = await client.authenticateAsync({});
	wSID = response[0].return  //use response.return for authenticate(), use response[0].return for authenticateAsync()
	}
	return 'got SID';
}

async function retrieveArticles() {

while(pubArray.length > 0) { // empty publication array before second and subsequent searches
   pubArray.pop();
}
while(editions.length > 0) { // empty edition array before second and subsequent searches
   editions.pop();
}
let retrieveParameters = [ {'count':'1', 'firstRecord':'1'}];
let timeSpan = [{'begin': timespanBegin, 'end':timespanEnd}];

let y=0; 
// flags for including/excluding WOS editions
if (document.querySelector('#flagSCI').checked) //Science Citation Index Expanded
	{editions.push({'collection':'WOS', 'edition':'SCI'}); y++;}
if (document.querySelector('#flagSSCI').checked) //Social Sciences Citation Index
	{editions.push({'collection':'WOS', 'edition':'SSCI'}); y++;}
if (document.querySelector('#flagAHCI').checked) //Arts & Humanities Citation Index
	{editions.push({'collection':'WOS', 'edition':'AHCI'}); y++;}
if (document.querySelector('#flagISTP').checked) //Conference Proceedings Citation Index - Science
	{editions.push({'collection':'WOS', 'edition':'ISTP'}); y++;}
if (document.querySelector('#flagISSHP').checked) //Conference Proceedings Citation Index - Social Sciences
	{editions.push({'collection':'WOS', 'edition':'ISSHP'}); y++;}
if (document.querySelector('#flagBSCI').checked) // Book Citation Index - Science
	{editions.push({'collection':'WOS', 'edition':'BSCI'}); y++;}
if (document.querySelector('#flagBHCI').checked) // Book Citation Index - Social Sciences and Humanities
	{editions.push({'collection':'WOS', 'edition':'BHCI'}); y++;}
// *** wos-lite isn't authorized for querying: IC edition: Index Chemicus **** //
//	{editions.push({'collection':'WOS', 'edition':'IC'});}
// *** wos-lite isn't authorized for querying: CCR edition: WOS CCR Current Chemical *** //
//	{editions.push({'collection':'WOS', 'edition':'CCR'});}
if (y==0) { 
	retrieveBtn.disabled=false;;
	alert ('En az bir dizin seçilmiş olmalı');
	return 'editions not selected';}
let search_object = {
  'queryParameters' : [{
	'databaseId' : 'WOS',
    'userQuery' : advText,
    'editions' : editions,
	'timeSpan': timeSpan,
	'queryLanguage': 'en'}],
	'retrieveParameters': retrieveParameters
}
	const search_client = await soap.createClientAsync(search_url);
	search_client.addHttpHeader('Cookie', 'SID=' + wSID)
	const result = await search_client.searchAsync(search_object);
		
	arrayLength=result[0].return.recordsFound; //use result.return for search(), use result[0].return for searchAsync()
	currentWindow=0;
	windowCount= ( ((arrayLength-1)/100) | 0)+1 // convert to integer, then compare if currentWindow = windowCount, then print array
	let progressPercentage= (100/windowCount)
	for (kk=0; kk<arrayLength; kk++) {
		pubArray.push([0]); // create empty elements on publication array
	}
	queryId = result[0].return.queryId;
	myConsole.log ('sessionID =', wSID, ',queryID =', queryId) 
	myConsole.log ('Between '+timespanBegin, ' and ', timespanEnd, ', number of articles indexed in Web of Science Collections you searched for are:', arrayLength)
	if (arrayLength===0) {
		return
	}
	retCount = arrayLength;
	if (countLimit > 0 && countLimit < arrayLength) { // for faster debugging
		retCount=countLimit; } 			// limit number of articles retrieved
	retBase = 1; //first record to be retrieved
	recNumber=0; // record number to be printed on the beginnig of lines
	for (r=0; r<windowCount; r++) {
		await retrieveHundred ();
	}
	myConsole.log ('all async accomplished');
	progressBar.style.width = (100)+ "%";
	return 'all async accomplished';

async function retrieveHundred () {
if (retCount <100)
	{pageSize = retCount;}
	else pageSize = 100;
let retrieve_object = {
	'queryId' : queryId,
	'retrieveParameters': [ 
		{'firstRecord': retBase, 'count': pageSize,
		'sortField' : [ {'name':sortField, 'sort':sortOrder }],
		'viewField': [{'fieldName': ['name', 'title']}]
		}]
}
myConsole.log ('number of articles to be retrieved=', pageSize, ' starting with',retBase)
	const rresult = await search_client.retrieveAsync(retrieve_object); 	//use rresult.return for retrieve(), use rresult[0].return for retrieveAsync()
	currentWindow++;
	//use rresult.return for retrieve(), use rresult[0].return for retrieveAsync()
	myConsole.log (rresult[0].return.records[0].uid, retBase, 'current Window:', currentWindow) 	// WOS of first article
	myConsole.log('start', retBase)
	handleHundred (rresult[0].return, retBase); 
retBase=retBase+100;
retCount=retCount-100;
progressBar.style.width = (progressPercentage*currentWindow  | 0)+ "%";
	myConsole.log('percentage', progressPercentage*currentWindow  | 0)
return 'page received and processed';
} //end of retrieveHundred ()

function handleHundred (articles, firstArray) {
var j=i = 0;
	for (i=0; i<articles.records.length; i++) {

		let authors = title=journal=year=pubdate=issue=volume=pages=articleNo=doi=doiLink=issn=eissn=quartile=docType=docSubtype='';
		let wos= articles.records[i].uid;
		let wosLink = preArticle+wos+postArticle
		let wosCitationLink= preCitation+wos+postCitation

		let authorArray=articles.records[i].authors[0].value.slice(0) // replicate authors
		let nAuthors=authorArray.length;

		for (j=0; j<articles.records[i].authors[0].value.length; j++) {
			authors = authors+authorArray[j]
			 if (j==nAuthors-1) { // this is the last author
				 if (authors.endsWith('.')) {
					 authors=authors+' '; }
				 else {authors=authors+'. '; } // print . after last author
			 }
			 else  {
				 authors=authors+';'; // print ; after each author
			 }
			}
		let titleObj= articles.records[i].title.find (tt =>tt.label==='Title');
		if (titleObj) {title=titleObj.value[0];}
		
		let journalObj= articles.records[i].source.find (j =>j.label==='SourceTitle');
		if (journalObj) {journal=journalObj.value[0];}

		let yearObj=articles.records[i].source.find (y=>y.label==='Published.BiblioYear');
		if (yearObj) {year=yearObj.value[0];}

		let dateObj=articles.records[i].source.find (pd=>pd.label==='Published.BiblioDate'); // just didn't print it
		if (dateObj) {pubdate=dateObj.value[0];} 

		let issueObj= articles.records[i].source.find (is =>is.label==='Issue');
		if (issueObj) {issue=issueObj.value[0];}

		let volumeObj= articles.records[i].source.find (v =>v.label==='Volume');
		if (volumeObj) {volume='('+volumeObj.value[0]+')';}

		let pagesObj= articles.records[i].source.find (p =>p.label==='Pages');
		if (pagesObj) {pages=pagesObj.value[0];}

		let artObj= articles.records[i].other.find (ar =>ar.label==='Identifier.article_no');
		if (artObj) {articleNo=artObj.value[0];}

		let doi1Obj= articles.records[i].other.find (d1 =>d1.label==='Identifier.Doi');
		if (doi1Obj) {doi=doi1Obj.value[0];}
		else {
			let doi2Obj= articles.records[i].other.find (d2 =>d2.label==='Identifier.Xref_Doi');	
			if (doi2Obj) {doi=doi2Obj.value[0];}
		}
		if (doi !== '') {doiLink=preDoi+doi}
		
		docType=articles.records[i].doctype[0].value[0];
		docSubtype=articles.records[i].doctype[0].value[1];
		docTypePrint = docType;
		if (docSubtype !== undefined ) {
			docTypePrint=docType+';'+docSubtype;}

		let issnObj= articles.records[i].other.find (is =>is.label==='Identifier.Issn');
		if (issnObj) {issn=issnObj.value[0];}

		let eissnObj= articles.records[i].other.find (es =>es.label==='Identifier.Eissn');
		if (eissnObj) {eissn=eissnObj.value[0];}

	if (issn=='') {issn ='ignore'} 
	if (eissn=='') {eissn ='ignore'} // danger!! empty eissn causes quartile to be Q1
	quartile = 'Q?'; // unknown, not in the list
	
	// check quartile values against WOS dictionaries first, because they are exactly matched by InCites
	if ( document.querySelector('#flagWOSDict').checked && wosq1List.indexOf(wos) > -1)
			{ quartile = 'Q1';}
	else if (document.querySelector('#flagWOSDict').checked && wosq2List.indexOf(wos) > -1) 
			{ quartile = 'Q2';}
	else if (document.querySelector('#flagWOSDict').checked && wosq3List.indexOf(wos) > -1) 
			{ quartile = 'Q3';}
	else if (document.querySelector('#flagWOSDict').checked && wosq4List.indexOf(wos) > -1 )  
			{ quartile = 'Q4';}
	// check quartile values against issn/eissn dictionaries if you didn't find in wos dictionary	
	else if (document.querySelector('#flagissnDict').checked && (issnq1List.indexOf(issn) > -1 || eissnq1List.indexOf(eissn) > -1))
			{ quartile = 'Q1';}
	else if (document.querySelector('#flagissnDict').checked && (issnq2List.indexOf(issn) > -1 || eissnq2List.indexOf(eissn) > -1))
			{ quartile = 'Q2';}
	else if (document.querySelector('#flagissnDict').checked && (issnq3List.indexOf(issn) > -1 || eissnq3List.indexOf(eissn) > -1))
			{ quartile = 'Q3';}
	else if (document.querySelector('#flagissnDict').checked && (issnq4List.indexOf(issn) > -1 || eissnq4List.indexOf(eissn) > -1))
			{ quartile = 'Q4';}
	else if (document.querySelector('#flagissnDict').checked && (issnahList.indexOf(issn) > -1 || eissnahList.indexOf(eissn) > -1))
			{ quartile = 'AH';}

	pubArray[firstArray-1+i][0]=authors;
	pubArray[firstArray-1+i][1]=title;
	pubArray[firstArray-1+i][2]=journal;
	pubArray[firstArray-1+i][3]=year;
	pubArray[firstArray-1+i][4]=issue;
	pubArray[firstArray-1+i][5]=volume;
	pubArray[firstArray-1+i][6]=pages;
	pubArray[firstArray-1+i][7]=articleNo;
	pubArray[firstArray-1+i][8]=docTypePrint;
	pubArray[firstArray-1+i][9]=wos;
	pubArray[firstArray-1+i][10]=doi;
	pubArray[firstArray-1+i][11]=nAuthors;
	pubArray[firstArray-1+i][12]=quartile;
	pubArray[firstArray-1+i][13]=doiLink;
	pubArray[firstArray-1+i][14]=wosLink;
	pubArray[firstArray-1+i][15]=wosCitationLink;
	pubArray[firstArray-1+i][16]=issn;
	pubArray[firstArray-1+i][17]=eissn;
	pubArray[firstArray-1+i][18]=docType;
	pubArray[firstArray-1+i][19]=docSubtype;
	}

			} // end of handleHundred ()		
} // end of retrieveArticles ()

# pupptetwosplus
puppetWOS + wos2quartile-converter

nodejs backed Electron App, puppeteers Web of Science, and filters Q1-Q2-Q3-Q4-AHCI status, according to quartile dictionarie. Reads (fetches) quartile dictionaries, and advanced search (query) texts from a target url

Please edit below code to read target files from your server:
```
const baseUrl='http://xxx.yyy.edu.tr/zzz/';
```

Target files are:
```
department-list.csv
author-list.csv
eissnq1.txt
eissnq2.txt
eissnq3.txt
eissnq4.txt
eissnahci.txt
issnq1.txt
issnq2.txt
issnq3.txt
issnq4.txt
issnahci.txt
```


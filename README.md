# 🚓 Police Election Administration & Route Management System
### పోలీస్ ఎలక్షన్ సెల్ - రూట్స్ & లైవ్ డాష్‌బోర్డ్ వెబ్ అప్లికేషన్

ఈ అప్లికేషన్ ఎన్నికల విధుల్లో భాగంగా జిల్లా ఎస్పీ (SP) గారు మరియు పోలీస్ ఉన్నతాధికారుల కోసం రియల్-టైమ్ రూట్ మానిటరింగ్, పోలింగ్ స్టేషన్ల బందోబస్తు, సెన్సిటివిటీ కేటగిరీలు మరియు ఫోర్స్ డిప్లాయ్‌మెంట్ ట్రాకింగ్ కోసం రూపొందించబడింది.

---

## 🌟 ముఖ్య ఫీచర్లు (Key Features)

1. **📊 Dashboard:**
   - మొత్తం పోలింగ్ స్టేషన్లు (1,329 రికార్డులు), ఓటర్ల సంఖ్య, రూట్ల లెక్కలు.
   - సెన్సిటివిటీ విభజన: **Normal, Sensitive, Critical, Hyper Sensitive** ఇంటరాక్టివ్ పై-చార్ట్ & బార్ చార్ట్‌లు.
   - పోలీస్ స్టేషన్ల వారీగా వల్నరబిలిటీ సమ్మరీ మ్యాట్రిక్స్.

2. **🗺️ Live Election Route Map (OSRM Real Road Routing):**
   - కేవలం స్ట్రెయిట్ లైన్లు కాకుండా రోడ్ల వెంబడి రియల్ డ్రైవింగ్ పాత్ (Real Road Driving Path).
   - గూగుల్ శాటిలైట్ హైబ్రిడ్ (Google Hybrid Satellite) & ఓపెన్‌స్ట్రీట్ మ్యాప్ లేయర్లు.
   - మండల బోర్డర్ లేయర్ (`BORDERSKL-Mandals.kmz`).
   - కలర్-కోడెడ్ సెన్సిటివిటీ పిన్స్ (Normal - Green, Sensitive - Yellow, Critical - Orange, Hyper Sensitive - Red).
   - పోలింగ్ స్టేషన్ పై క్లిక్ చేయగానే రూట్ ఆఫీసర్ (SI, CI ఫోన్ నంబర్లు), BLO కాంటాక్ట్, ఓటర్లు, దూరం వివరాలు.

3. **📋 Polling Stations Master Report (CRUD Table):**
   - ఏ కాలమ్ ద్వారానైనా ఇన్‌స్టంట్ సెర్చ్ & ఫిల్టరింగ్ (PS Name, Mandal, Category, Route).
   - పేజీనేషన్ (Pagination: 25, 50, 100, 500, All).
   - సింగిల్ క్లిక్ తో **Excel Export (.xlsx)** & ప్రింట్ రిపోర్ట్.
   - Edit, Delete మరియు మ్యాప్‌లో ప్రదేశం చూసే యాక్షన్స్.

4. **🚗 PS Route Wise Tracking:**
   - పోలీస్ స్టేషన్ మరియు రూట్ నంబర్ ఎంచుకోగానే ఆ రూట్ లోని అన్ని స్టేషన్ల విజిటింగ్ ఆర్డర్ (Itinerary).
   - రూట్ మొబైల్ ఆఫీసర్ కాంటాక్ట్ & మొత్తం డ్రైవింగ్ డిస్టెన్స్ (KM).

5. **➕ Add / Edit Polling Station:**
   - కొత్త స్టేషన్ వివరాలను జోడించడం.
   - మ్యాప్ పై క్లిక్ చేసి నేరుగా GPS Latitude / Longitude నింపే సదుపాయం (Coordinate Picker).
   - డేటా బ్రౌజర్ లోకల్ స్టోరేజ్ (LocalStorage) లో ఆటోమేటిక్‌గా సేవ్ అవుతుంది.

---

## 🚀 GitHub లో ఎలా రన్ చేయాలి? (How to Run in GitHub Pages)

ఈ అప్లికేషన్ ఎటువంటి సర్వర్ లేదా డేటాబేస్ ఇన్‌స్టాలేషన్ అవసరం లేకుండా **GitHub Pages లో 100% ఉచితంగా, లైవ్ వెబ్‌సైట్ గా** రన్ అవుతుంది!

### స్టెప్ 1: GitHub లో రిపాజిటరీ క్రియేట్ చేయండి
1. [github.com](https://github.com) లోకి లాగిన్ అయి కొత్త రిపాజిటరీని సృష్టించండి (ఉదాహరణకు: `election-cell`).
2. Public గా ఉంచండి.

### స్టెప్ 2: ఫైల్స్‌ను GitHub కు పుష్ చేయండి
మీ కంప్యూటర్‌లో టెర్మినల్ / PowerShell ఓపెన్ చేసి కింది కమాండ్స్ రన్ చేయండి:

```bash
cd "c:\Users\seeka\Desktop\Election Cell"
git init
git add .
git commit -m "Initial commit for Police Election Cell App"
git branch -M main
git remote add origin https://github.com/<YOUR-USERNAME>/<YOUR-REPO-NAME>.git
git push -u origin main
```

*(లేదా నేరుగా GitHub వెబ్‌సైట్ లోకి వెళ్లి ఈ ఫోల్డర్ లోని ఫైల్స్‌ను Drag & Drop చేసి Upload చేయవచ్చు).*

### స్టెప్ 3: GitHub Pages ఆన్ చేయండి (Only 30 Seconds!)
1. మీ GitHub Repository లోకి వెళ్లి పైన ఉన్న **Settings** ట్యాబ్ క్లిక్ చేయండి.
2. ఎడమవైపు మెనూలో **Pages** పై క్లిక్ చేయండి.
3. **Build and deployment** సెక్షన్ క్రింద:
   - Source: **Deploy from a branch** ఎంచుకోండి.
   - Branch: **`main`** మరియు ఫోల్డర్: **`/(root)`** సెలెక్ట్ చేసి **Save** బటన్ నొక్కండి.
4. కేవలం 1 నిమిషంలో మీకు లైవ్ లింక్ వస్తుంది:
   `https://<YOUR-USERNAME>.github.io/<YOUR-REPO-NAME>/`

ఈ లింక్‌ను మీ SP గారికి మరియు సర్కిల్ ఇన్‌స్పెక్టర్లు, సబ్-ఇన్‌స్పెక్టర్లందరికీ షేర్ చేయవచ్చు! వారు ఫోన్లలో లేదా కంప్యూటర్లలో ఎక్కడినుంచైనా డైరెక్ట్‌గా చూసుకోవచ్చు.

---

## 💻 లోకల్ కంప్యూటర్‌లో రన్ చేయడం (Local Offline Run)

మీ కంప్యూటర్‌లో ఇంటర్నెట్ లేకున్నా లేదా లోకల్ గా రన్ చేసుకోవడానికి:
- ఫోల్డర్ లోని **`run_local.bat`** ఫైల్ పై డబుల్ క్లిక్ చేయండి.
- వెంటనే మీ బ్రౌజర్‌లో `http://localhost:8080` ఓపెన్ అవుతుంది.

---

## 📁 ఫోల్డర్ లోని ముఖ్య ఫైల్స్:
- `index.html` - సింగిల్ పేజీ మెయిన్ అప్లికేషన్ (Dashboard, Map, Table, Forms).
- `data/stations.json` - మొత్తం 1,329 పోలింగ్ స్టేషన్ల పూర్తి డేటా.
- `data/stations.js` - CORS ఆటంకం లేకుండా ఆఫ్‌లైన్ లోడ్ అయ్యే JS డేటా.
- `BORDERSKL-Mandals.kmz` - మండల బౌండరీ లేయర్.
- `NORMAL.jpeg`, `SENSITIVE.jpeg`, `CRITICAL.jpeg`, `HYPER SENSITIVE.jpeg` - పోలీస్ పిన్ మార్కర్ ఐకాన్లు.
- `server.py` & `run_local.bat` - లోకల్ డెవలప్‌మెంట్ వెబ్ సర్వర్.

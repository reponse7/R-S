const fs = require('fs');

const csvData = `companyName,tin,creditLimit,terms,lastOrderDate,boxModels,totalOrders,totalQuantityProduced
AFRICAN GIN LTD,N/A,0,Standard,2025-12-05,African Gin 24 x 300; African Gin 24x300ml,2,3210
ALPHA MEDIA,N/A,0,Standard,2026-05-25,80 gsm; A4 80 GSM; A4 Copier Box; Notebook,6,83830
AMACO PAINTS,N/A,0,Standard,2026-03-16,Paint 12 x 1 Ltrs; Paint 4 x 4 Ltrs; Thinner 12 X 1 Ltrs; Thinner 6 X 5 Ltrs,18,100778
APVRO,N/A,0,Standard,2026-04-10,Plain box,1,4500
AQUASAFE,N/A,0,Standard,2026-01-09,Water 12x1500ml; Water 24x600ml,2,4248
BEL & F CO LTD,N/A,0,Standard,2026-06-02,Safex 12x1.5L; Safex Drinking Water 12 x 1.5 Ltrs; Safex Drinking Water 24 x 500 Ml; Safex12x1.5L; Safex12x1.5l,9,87529
BEM,N/A,0,Standard,2025-09-05,Filter Star; Premier,2,3381
BEST GROUP,N/A,0,Standard,2025-06-05,Plain Box,1,1130
BEWDA COMPANY,N/A,0,Standard,2026-06-19,Body cotion; Body cream; Glycerine; Hair angel; Owezo Glycerine; UWEZO glycerine 290x220x115- 3ply brown printed; Uwezo Glycerine; Uwezo glycerine,8,45307
BMB MULTI SERVICES,N/A,0,Standard,2026-01-15,Mavie Water 12 x 1500 ml; Mavie Water 24 x 600 ml; Mavie12x1.5L,5,45600
BMB MULTISERVICES,N/A,0,Standard,2025-09-05,Mavie Water 12 x 1500ml; Mavie Water 24 x 600ml,2,41453
BRALIRWA,N/A,0,Standard,2026-06-25,Fanta Citron 12 x 50 Cl; Fanta Citron 6 x 1.5L; Fanta citro 12x50Cl; Fanta citro 12x50cl,22,322917
BUSCO BURUNDI,N/A,0,Standard,2026-05-11,Agakura 24x300ml; Agakura new 24x500ml,2,30161
BUSCO LTD,N/A,0,Standard,2026-06-19,Agakura 24x300ml; Agakura 24x500ml; Agakura24x300ml,12,179038
DANGOTE,N/A,0,Standard,2026-01-15,Wine24x350ml,2,5602
DOUBLE DESIGN,N/A,0,Standard,2025-05-31,Plain Boxes,1,1050
ECO SPLENDED,N/A,0,Standard,2025-10-13,WOW Water 24 X 500ml,1,5145
ECO SPLENDID,N/A,0,Standard,2025-08-15,WOW Water 500mlx12,1,3345
ELECTROMAX,N/A,0,Standard,2025-11-21,Drinking Water 12 x 1.5 Ltr; Drinking Water 24 X 500 Ml Plain; Drinking Water 5 Ltr; Drinking water 12x1.5L,9,9084
ESB OKSARL,N/A,0,Standard,2026-03-18,MAI FRESH 24X500ML; Mai fresh12x1500ml,2,10595
EST.C'EST DIEU OUI DONNE,N/A,0,Standard,2025-07-14,Kilimanjaro Mineral Water 1.5 Ltr; Kilimanjaro Mineral Water 12 x 1.5 Ltr; Kilimanjaro Mineral Water 24 x 600 ml,5,10700
ETC BIENVENIDA,N/A,0,Standard,2026-03-16,Tik tok,1,15188
ETS AB BUSINESS,N/A,0,Standard,2026-04-08,Vin missile 24x300ml,1,10112
ETS BIENVENDA,N/A,0,Standard,2025-10-01,JB32 24x200ml; TIKTOK20X300ml,2,42604
ETS BIENVENIDA,N/A,0,Standard,2026-06-09,20x300; Tik tok 24x300ml; Tiktok20x300ml; Whisky,7,156291
ETS BMB,N/A,0,Standard,2026-06-25,Mavie 12x1.5l; Mavie 24x600ml; Mavie12X1500ml; Mavie24x600ml,12,171193
ETS BORA MAISHA,N/A,0,Standard,2026-01-15,Vin des Sages 24 x 300ml,4,23709
ETS MUSAVULI- NORD - KIVU/RD CONGO,N/A,0,Standard,2025-07-14,Asili Tangausi 24 x 300 ml; JB 24 X 300 ml; UMBO 24 X 300 ml; Whisky Umbo ya Papa 20 x300 ml,7,100160
EVCO,N/A,0,Standard,2026-04-10,Sprendid,1,1902
EVCO SPLENDED,N/A,0,Standard,2026-03-05,WOW Water 24x500ml,1,5010
EVICO SPLENDID LTD,N/A,0,Standard,2026-01-15,WOW Water 24x500ml; WOW Water12x1.2L,2,13594
FABR RWANDA,N/A,0,Standard,2025-09-05,Glycerine,1,3188
FABRI RWANDA,N/A,0,Standard,2025-08-15,Glycerine 5Dozx50ml; UWEZO Beauty Cream 385x260x138 -3ply brown printed; UWEZO glycerine 290x220x115- 3ply brown printed,3,22810
FAMILY STRONG,N/A,0,Standard,2025-10-01,Glycerine,1,1296
GLOBAL,N/A,0,Standard,2026-03-05,Tangawizi energy 24x500ml,1,2091
GOODSFLY,N/A,0,Standard,2025-11-21,57x40x13mm(100roll); 80X80X3mm(50roll),2,4000
GREATY INTEGRITY,N/A,0,Standard,2025-08-15,Megi 9W,1,3100
HEDEN JELLY,N/A,0,Standard,2025-10-24,24 X 250g BLUE; 24 x 250g,2,6594
IMPERIAL TRADE,N/A,0,Standard,2025-12-05,Temoin Gin 24 x 300 ml,2,6180
IMPRIMERIE DE KABGAYI,N/A,0,Standard,2025-07-28,Un Printed Boxes,2,3252
IMPRIMU,N/A,0,Standard,2025-08-06,New Size Book,1,1229
IMPRIMU DE KABGAYI,N/A,0,Standard,2026-06-25,Plain Box; Plain box; Plain boxes,3,5697
INGUFU GIN LTD,N/A,0,Standard,2026-02-19,King's Vodak 24x 200 ml; Rabiant Gin 24 x 200 ml; Red Waragi 24 x 200 ml; RoyaL Castle Gin - 24 x 200ml,29,427342
INOVOS LTD,N/A,0,Standard,2025-12-16,Plain Box; Sanitary pads 40pcs,2,1046
INYANGE,N/A,0,Standard,2025-12-16,Inyange Milk12x500ml; UHT Whole Milk12x500ml; Water12x500ml,3,997
IPN,N/A,0,Standard,2026-04-24,Gana ishuri,1,2800
ISHEMA RYANGE,N/A,0,Standard,2026-06-25,Jumbo book; Plain box,2,1375
ISHEMA RYANJYE,N/A,0,Standard,2025-11-21,Plain Box; Printed box,2,2346
JOHANA,N/A,0,Standard,2025-11-21,Baby jelly; Baby jelly3dozx250ml; Hair Relaxer 6dozx150g; Hair shampoo12x1L,4,10340
KAEAMA GROUP,N/A,0,Standard,2026-05-09,Table vinegar 12x700ml,1,1440
KAEMA GROUP,N/A,0,Standard,2026-06-25,Table vinegar,1,1150
KASESA,N/A,0,Standard,2026-06-25,African Gin 24 x 200 ml; African Gin 24 x 205 ml; African gin 24x205; Orginal pure waragi; Original Pure Waragi6x4x200ml; Pure Waragi 24 x 205ml; Pure Waragi 6 x 4 x 200 ml,28,431359
KASHARASH,N/A,0,Standard,2026-03-05,Teak 4x5l,1,600
KASHLASH,N/A,0,Standard,2025-08-25,TEAK,1,1194
KAZULI CHILLI,N/A,0,Standard,2025-11-10,80GSM,1,1100
KEAMA GROUP,N/A,0,Standard,2026-02-19,Table Vinegar,2,7745
KEMA GROUP - MUHANGA,N/A,0,Standard,2025-07-28,Table Vinegar,2,7530
KILIMANJALO,N/A,0,Standard,2026-01-15,12 x 1.5L; 24 x 600ml; 24X600ml; Water 12x1500ml,4,8911
KILIMANJARO,N/A,0,Standard,2026-06-09,Water 12x1.5l; Water 24x600ml; Water12x1500ml; Water24x600ml,8,27670
KINAZI CASSAVA,N/A,0,Standard,2026-01-15,Cassava Flaur20kg,1,5100
LA QUALITE PRODUIT PAR,N/A,0,Standard,2025-08-15,VIN TIKTOCK,1,40376
LA QUALITE PRODUITE PAR ETS BIENVENIDA,N/A,0,Standard,2025-06-07,Vin Tik Tok 20 x 300 ml,2,82845
LOA,N/A,0,Standard,2025-10-24,Fun Lollipop; LO A - Baby Wipes 120 Pcs x 18 Pkt; LO A - Baby Wipes 60 Pcs x 24Pkt; LOA - 12W X 50 Pcs; LOA - Adult Wipes 80 Pcs x 24 Pkt; Perle Led Bulb 7W; Wipes,16,34868
MACADAMIA,N/A,0,Standard,2026-01-15,Plain Box,1,970
MASTER BEAUTY,N/A,0,Standard,2026-06-25,Glycerine; Master Simba 4x5L; Mwiza-Jelly3dozx250g; Shampoo; Simba 4 x 5L,7,15172
MAYI NI MOJA,N/A,0,Standard,2025-10-01,Congo Nil 24x600ml,1,1140
MBELYCO PAINTS,N/A,0,Standard,2026-04-16,12X1L; 4X4L; 4x4L,6,19895`;

const stop_words = new Set([
  'ltd', 'limited', 'company', 'co', 'ets', 'ste', 'sarl', 
  'entreprise', 'enterprise', 'group', 'esb', 'inc', 'ddl', 
  'distillers', 'industry', 'industries', 'product'
]);

function normalize_company_name(name) {
  const clean = name.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const tokens = clean.split(/\s+/).filter(w => w && !stop_words.has(w));
  tokens.sort();
  return tokens.join(' ');
}

function parseCSV(csv) {
    const lines = csv.split('\n');
    const headers = lines[0].split(',');
    const results = [];
    
    for (let i = 1; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) continue;
        
        const row = {};
        let inQuotes = false;
        let currentValue = '';
        let headerIndex = 0;
        
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                row[headers[headerIndex]] = currentValue.replace(/^"|"$/g, '').trim();
                currentValue = '';
                headerIndex++;
            } else {
                currentValue += char;
            }
        }
        if (headerIndex < headers.length) {
             row[headers[headerIndex]] = currentValue.replace(/^"|"$/g, '').trim();
        }
        
        results.push(row);
    }
    return results;
}

const data = parseCSV(csvData);
const grouped = {};

function safeFallback(val, defaultVal) {
    if (!val || val.trim() === '' || val.trim().toLowerCase() === 'unknown' || val.trim().toLowerCase() === 'n/a') {
        return defaultVal;
    }
    return val;
}

for (const row of data) {
    let raw_name = safeFallback(row.companyName, "Standard Client Profile");
    
    const key = normalize_company_name(raw_name);
    if (!grouped[key]) {
        grouped[key] = {
            companyName: raw_name,
            tin: safeFallback(row.tin, 'N/A'),
            boxModels: new Set(),
            totalOrders: 0,
            totalQuantityProduced: 0,
            lastOrderDate: safeFallback(row.lastOrderDate, '2020-01-01'),
            creditLimit: parseFloat(safeFallback(row.creditLimit, '0')),
            terms: safeFallback(row.terms, 'Standard')
        };
    }
    
    const target = grouped[key];
    target.totalOrders += parseInt(row.totalOrders || '0', 10);
    target.totalQuantityProduced += parseInt(row.totalQuantityProduced || '0', 10);
    
    if (row.boxModels) {
        // split by semi-colon or comma
        const models = row.boxModels.split(/[;,]/);
        for (let m of models) {
            m = m.trim();
            if (m && m.toLowerCase() !== 'unknown' && m.toLowerCase() !== 'n/a') {
                target.boxModels.add(m);
            }
        }
    }
            
    const rowDate = safeFallback(row.lastOrderDate, '2020-01-01');
    if (rowDate > target.lastOrderDate) {
        target.lastOrderDate = rowDate;
    }
    
    // update companyName to shortest/longest or just keep first? We'll keep first.
}

const deduped = Object.values(grouped).map(record => {
    return {
        id: normalize_company_name(record.companyName).replace(/\\s+/g, '-'),
        companyName: record.companyName,
        tin: record.tin,
        boxModels: record.boxModels.size > 0 ? Array.from(record.boxModels).join('; ') : 'Custom Box',
        totalOrders: record.totalOrders,
        totalQuantityProduced: record.totalQuantityProduced,
        lastOrderDate: record.lastOrderDate,
        paymentTerms: record.terms,
        creditLimit: record.creditLimit
    };
});

fs.writeFileSync('src/data/clientsData.json', JSON.stringify(deduped, null, 2));
console.log('Successfully created src/data/clientsData.json with ' + deduped.length + ' deduped records.');

/* ==========================================================================
   product-master-data.js — centralized Product <-> Item Code master
   ==========================================================================
   Digitized verbatim from the official source workbook:
   FMC ULKER PLANT QUALITY INCIDENT REPORT OCT.2026.xlsx, sheet "Carton per
   pallet" (columns: Item Code, Source, Product Description, Cases / Pallet).

   Source sheet had 101 data rows -> 100 imported records (1 exact duplicate
   row skipped, same Item Code+Description+Source+Cases/Pallet in both rows —
   see PRODUCT_MASTER_META.skippedExactDuplicates). Item Codes are kept as
   literal strings exactly as authored in the workbook (leading zeros/hyphens
   preserved) — never parsed as numbers.

   Two genuine ambiguities exist in the source data itself and are preserved
   as-is (never silently resolved) — see PRODUCT_MASTER_META.ambiguous:
     - Item Code 51112-05 maps to TWO different Product Descriptions
       ('Tea Biscuit Cocoa 70gx12x12' vs 'Tea Biscuit Cocoa 70g 12x12 With
       Recipe') — both kept as separate records; the lookup UI must let the
       user choose rather than auto-picking one.
     - Product Description 'GDV Box Dark Choc Gan 117g1x16' maps to TWO
       different Item Codes (51537-01 and 55003-02) — same treatment.

   Do NOT hand-edit records here to "fix" something that looks unusual —
   preserve the source data as-is; correct it at the source workbook instead.
   ========================================================================== */
const PRODUCT_MASTER = [
  {item:'51343-03', desc:'Halley Strawberry 26g 20x12', source:'FMC', casesPerPallet:28},
  {item:'51142-08', desc:'Biskrem 27gx24x9', source:'FMC', casesPerPallet:40},
  {item:'51396-03', desc:'Deluxe Wafer Chocolate 40g 12x20', source:'FMC', casesPerPallet:32},
  {item:'50078-03', desc:'Chocosandwich Roll 235g 12x4', source:'FMC', casesPerPallet:28},
  {item:'50285-21', desc:'Hobby Coated Wafer 20g 12x12', source:'FMC', casesPerPallet:96},
  {item:'50385-01', desc:'Rana Golden Finger 16g 40x12', source:'FMC', casesPerPallet:35},
  {item:'51231-14', desc:'RED NAPOLITEN  8Pcs 30gx24x6', source:'FMC', casesPerPallet:90},
  {item:'51231-15', desc:'Napoliten Milk Choco 30g 10x16', source:'FMC', casesPerPallet:60},
  {item:'51232-01', desc:'Napoliten Dark Choco 30g 10x16', source:'FMC', casesPerPallet:60},
  {item:'51280-10', desc:'Hobby Hazelnut 18g 12x12', source:'FMC', casesPerPallet:144},
  {item:'51342-09', desc:'Halley Single Choc 26g 20x12', source:'FMC', casesPerPallet:28},
  {item:'51915-07', desc:'Surpriz Define 294g 8x1', source:'FMC', casesPerPallet:144},
  {item:'51917-05', desc:'Surpriz 3Pcs 21g 24x6', source:'FMC', casesPerPallet:96},
  {item:'51924-14', desc:'Napoliten Gift Box 214g 1x12', source:'FMC', casesPerPallet:84},
  {item:'52421-04', desc:'Deluxe WaferRoll Haz.24g 10x18', source:'FMC', casesPerPallet:28},
  {item:'55001-02', desc:'GDV Bar Milk Choc Gan30g 12x12', source:'FMC', casesPerPallet:48},
  {item:'53421-01', desc:'Rico Rolls Chocolate 16g 12x12', source:'FMC', casesPerPallet:42},
  {item:'54421-01', desc:'Deluxe Choconut Haze 35gx12x12', source:'FMC', casesPerPallet:80},
  {item:'54421-02', desc:'Deluxe Choconut Pist 35gx12x12', source:'FMC', casesPerPallet:80},
  {item:'55001-01', desc:'GDV Bar Milk Choc Car32g 12x12', source:'FMC', casesPerPallet:48},
  {item:'55001-03', desc:'GDV Bar Milk Choc Haz30g 12x12', source:'FMC', casesPerPallet:48},
  {item:'55002-02', desc:'GDV Pure (Salt Cara) 32g 12X4', source:'FMC', casesPerPallet:264},
  {item:'55002-01', desc:'GDV Pure (Milk) 32g 12X4', source:'FMC', casesPerPallet:264},
  {item:'55002-03', desc:'GDV Pure (72% Dark) 32g 12X4', source:'FMC', casesPerPallet:264},
  {item:'55002-04', desc:'GDV Pure Dark Sea Salt 32g12X4', source:'FMC', casesPerPallet:264},
  {item:'55002-11', desc:'GDV Pure (72% Dark) 90Gx6X3', source:'FMC', casesPerPallet:252},
  {item:'55002-12', desc:'GDV Pure (Salt Cara) 90Gx6X3', source:'FMC', casesPerPallet:252},
  {item:'55002-13', desc:'GDV Pure Milk Choco 90Gx6X3', source:'FMC', casesPerPallet:252},
  {item:'55002-14', desc:'GdV Pure Blood Orange 90Gx6X3', source:'FMC', casesPerPallet:252},
  {item:'55002-15', desc:'GDV Pure (Sea Salt) 90Gx6X3', source:'FMC', casesPerPallet:252},
  {item:'55004-01', desc:'GDV Bar Choco&Creme 35g 24x6', source:'FMC', casesPerPallet:75},
  {item:'55004-02', desc:'GDV Bar Double Choco 35g 24x6', source:'FMC', casesPerPallet:75},
  {item:'55004-07', desc:'Godiva Caramel Bar 35g 24x6', source:'FMC', casesPerPallet:75},
  {item:'55341-01', desc:'Rana Mero Marshmallow23gx24x12', source:'FMC', casesPerPallet:28},
  {item:'51145-18', desc:'Biskrem Roll 99g 24+3x6', source:'FMC', casesPerPallet:20},
  {item:'50001-01', desc:'Biskrem Caramel 36g 12X32', source:'FMC', casesPerPallet:21},
  {item:'50178-03', desc:'Ulker Sesame Biscuit 58g 12x12', source:'FMC', casesPerPallet:24},
  {item:'51112-05', desc:'Tea Biscuit Cocoa 70gx12x12', source:'FMC', casesPerPallet:24},
  {item:'51113-00', desc:'Ulker Tea Biscuit 147g 12x6', source:'FMC', casesPerPallet:24},
  {item:'51113-13', desc:'Tea Biscuit 70g 12x12', source:'FMC', casesPerPallet:24},
  {item:'51114-03', desc:'Finger Biscuit 70g 12x12', source:'FMC', casesPerPallet:24},
  {item:'51116-01', desc:'Tea Biscuit Cinnamon 70gx12x12', source:'FMC', casesPerPallet:24},
  {item:'51117-02', desc:'Circle Coffee Biscuit 58gx12x12', source:'FMC', casesPerPallet:28},
  {item:'52421-05', desc:'Deluxe WaferRoll Van.24g 10x18', source:'FMC', casesPerPallet:28},
  {item:'51142-06', desc:'Biskrem 36g 12X32', source:'FMC', casesPerPallet:21},
  {item:'51144-77', desc:'Biskrem 54g 24x9', source:'FMC', casesPerPallet:24},
  {item:'51145-19', desc:'Biskrem Roll 99g x24x6', source:'FMC', casesPerPallet:24},
  {item:'51196-04', desc:'DELUXE WAFER HAZELNU.40g 24x10', source:'FMC', casesPerPallet:32},
  {item:'51196-05', desc:'DELUXE WAFER HAZELNU 40g 12x20', source:'FMC', casesPerPallet:32},
  {item:'51496-03', desc:'Deluxe Wafer Vanilla 40g 12 X 20', source:'FMC', casesPerPallet:32},
  {item:'51596-03', desc:'Deluxe Wafer Straw 40g 12x20', source:'FMC', casesPerPallet:32},
  {item:'52073-01', desc:'Chocosandwich 23.5g 24x12', source:'FMC', casesPerPallet:28},
  {item:'52073-02', desc:'Chocosandwich 23.5g 20x12', source:'FMC', casesPerPallet:28},
  {item:'53072-01', desc:'Chocosandwich Dark 23.5g 24x12', source:'FMC', casesPerPallet:28},
  {item:'53072-02', desc:'Chocosandwich Dark 23.5g 20x12', source:'FMC', casesPerPallet:28},
  {item:'54072-01', desc:'Chocosandwich D Van 23.5g20x12', source:'FMC', casesPerPallet:28},
  {item:'54072-02', desc:'Chocosandwich D Van 23.5g24x12', source:'FMC', casesPerPallet:28},
  {item:'55111-03', desc:'McV Caramel Lite 80g12x12', source:'FMC', casesPerPallet:30},
  {item:'55002-16', desc:'GDV Pure (90% Dark) 90g 6X3', source:'FMC', casesPerPallet:252},
  {item:'55006-02', desc:'GDV Bar Cappuccino 35g 24x6', source:'FMC', casesPerPallet:75},
  {item:'55013-01', desc:'GDV Tab Milk Choc Haz 83g 6x12', source:'FMC', casesPerPallet:48},
  {item:'55012-01', desc:'GDV Tab Dark Choc Gan 86g 6x12', source:'FMC', casesPerPallet:48},
  {item:'55011-01', desc:'GDV Tab Milk Choc Car 86g 6x12', source:'FMC', casesPerPallet:48},
  {item:'55003-03', desc:'GDV Box Milk Choc Haz 118g1x16', source:'FMC', casesPerPallet:60},
  {item:'55003-01', desc:'GDV Box Milk Choc Car 119g1x16', source:'FMC', casesPerPallet:60},
  {item:'51537-01', desc:'GDV Box Dark Choc Gan 117g1x16', source:'FMC', casesPerPallet:60},
  {item:'55003-02', desc:'GDV Box Dark Choc Gan 117g1x16', source:'FMC', casesPerPallet:60},
  {item:'51142-02', desc:'Biskrem 36g 16x24', source:'FMC', casesPerPallet:21},
  {item:'51113-11', desc:'Tea Biscuit 70gx12x12', source:'FMC', casesPerPallet:24},
  {item:'51112-02', desc:'Tea Biscuit Cocoa 70g 12x12', source:'FMC', casesPerPallet:24},
  {item:'51113-24', desc:'Tea Biscuit 70g 12x12 (Promo)', source:'FMC', casesPerPallet:24},
  {item:'51119-01', desc:'Tea Biscuit Coconut 70g 12x12', source:'FMC', casesPerPallet:24},
  {item:'52355-01', desc:'Rana Mero Peanut Bar 16g 24x12', source:'FMC', casesPerPallet:65},
  {item:'51342-11', desc:'Halley Single Choc 26g 10x12', source:'FMC', casesPerPallet:52},
  {item:'51500-01', desc:'Biskrem Cinnamon 36g 12X32', source:'FMC', casesPerPallet:21},
  {item:'51501-01', desc:'Biskrem Tiramisu 36g 12X32', source:'FMC', casesPerPallet:21},
  {item:'51502-01', desc:'Biskrem Cardamom 36g 12X32', source:'FMC', casesPerPallet:21},
  {item:'51396-05', desc:'Deluxe Wafer Chocolate 144gx24', source:'FMC', casesPerPallet:90},
  {item:'51496-05', desc:'Deluxe Wafer Vanilla 144gx24', source:'FMC', casesPerPallet:90},
  {item:'51196-08', desc:'Deluxe Wafer Hazelnut 144gx24', source:'FMC', casesPerPallet:90},
  {item:'51596-05', desc:'Deluxe Wafer Strawbarry144GX24', source:'FMC', casesPerPallet:90},
  {item:'56001-01', desc:'GDV Dome Hazelnut 240gx8', source:'FMC', casesPerPallet:30},
  {item:'58113-01', desc:'McV Chai Time Butter 100gx12x1', source:'FMC', casesPerPallet:24},
  {item:'58111-01', desc:'McV Chai Time Almond 100g12x12', source:'FMC', casesPerPallet:24},
  {item:'58112-01', desc:'McV Chai Time Pista 100gx12x12', source:'FMC', casesPerPallet:24},
  {item:'51113-12', desc:'Tea Biscuit 70g 12x12 Export', source:'FMC', casesPerPallet:24},
  {item:'51112-03', desc:'Tea Biscuit Cocoa 70g 12x12 Export', source:'FMC', casesPerPallet:24},
  {item:'51112-05', desc:'Tea Biscuit Cocoa 70g 12x12 With Recipe', source:'FMC', casesPerPallet:24},
  {item:'50178-04', desc:'Sesame 58gx12x12 Export', source:'FMC', casesPerPallet:24},
  {item:'51117-03', desc:'Coffee Biscuit 58gx12x12 Export', source:'FMC', casesPerPallet:24},
  {item:'55111-04', desc:'McV Caramel Lite 80g 12x12 EXP', source:'FMC', casesPerPallet:30},
  {item:'51142-07', desc:'Biskrem 36g 12x32 Export', source:'FMC', casesPerPallet:21},
  {item:'51144-88', desc:'Biskrem 54gx24x9 export', source:'FMC', casesPerPallet:24},
  {item:'51145-22', desc:'Biskrem Roll 99g 24x6 Export', source:'FMC', casesPerPallet:24},
  {item:'51924-11', desc:'Napoliten Gift Box 326g 6x1 Export', source:'FMC', casesPerPallet:110},
  {item:'51800-01', desc:'Ulker Dubai Choco Bites21g14x6', source:'FMC', casesPerPallet:72},
  {item:'421-6N', desc:'RuloKat 24g 24x8', source:'FMC', casesPerPallet:40},
  {item:'51421-08', desc:'Rulokat 24g 24x6', source:'FMC', casesPerPallet:50},
  {item:'52421-00', desc:'Rulokat 16g 24x12', source:'FMC', casesPerPallet:28},
  {item:'51342-10', desc:'Halley Single Choc 26g 20x12 Export', source:'FMC', casesPerPallet:52},
];

const PRODUCT_MASTER_META = {
  sourceFile: 'FMC ULKER PLANT QUALITY INCIDENT REPORT OCT.2026.xlsx',
  sourceSheet: 'Carton per pallet',
  totalSourceRows: 101,
  importedRecords: 100,
  skippedExactDuplicates: [
    {row:100, item:'52421-05', desc:'Deluxe WaferRoll Van.24g 10x18'},
  ],
  ambiguous: {
    itemCodes: ['51112-05'],       // item code -> multiple distinct descriptions
    descriptions: ['GDV Box Dark Choc Gan 117g1x16'], // description -> multiple distinct item codes
  },
};

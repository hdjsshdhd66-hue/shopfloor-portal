/* ==========================================================================
   ppe.js — PPE Management (Safety Portal)
   ==========================================================================
   Digitizes the company's real PPE Requirement Matrix, PPE/First Aid/
   Equipment Inventory, and Issuance workflow into the existing Shop Floor
   Digital Portal — same architecture as the rest of the app (plain global
   functions/vars, no build system, no framework).

   Reference data:  ppe-data.js -> global PPE_DATA (matrix, inventory
                     snapshot, dropdown master lists) — never mutated.
   Persisted data:  safetyData.ppeIssuance[]        (every issuance transaction)
                     safetyData.ppeStockTx[]          ("Receive Stock" transactions)
                     safetyData.ppeItemOverrides{}    (edited item fields, overlaid on PPE_DATA)
                     safetyData.ppeCustomItems[]      (items added in-app, not in the workbook)
   All persist through the app's existing saveState()/loadState() (pqs_data).

   Current Stock is NEVER stored as a mutable number — it is always derived:
     Current Stock = Opening Balance + Received (workbook baseline + all
     "Receive Stock" transactions) − Net Issued (gross issued − reusable
     returns). See ppeCurrentStock(). This is the fix for the source
     workbook's own gap: its "Total Issued" formula never accounted for
     returned/reusable loan items (see PPE_MODULE_NOTES in the final
     report) — implemented correctly here per the task's explicit
     instruction not to copy a broken/incomplete formula.
   ========================================================================== */

/* ============================== CONSTANTS ============================== */
var PPE_STATUS_COLOR = { ok:'#16a34a', low:'#d97706', reorder:'#dc2626', out:'#7f1d1d' };
var PPE_STATUS_LABEL = { ok:'OK', low:'Low Stock', reorder:'Reorder Now', out:'Out of Stock' };
var PPE_CATEGORIES = ['PPE', 'First Aid', 'Equipment'];

/* ============================== STATE =================================== */
var _ppeTab = 'dashboard'; // dashboard | matrix | inventory | issue | records | alerts | analytics
var _ppeMatrixFilter = { q:'', group:'all', mandatoryOnly:false, recommendedOnly:false };
var _ppeMobileTask = null;
var _ppeInvFilter = { q:'', category:'all', status:'all' };
var _ppeRecordsFilter = { q:'', dept:'all', category:'all', reason:'all', issuedBy:'all', dateFrom:'', dateTo:'' };
var _ppeAlertsFilter = { category:'all' };
var _ppeAnalyticsMonths = 6;
var _ppeEditingIssuanceId = null;
var _ppeEmpPickCtx = null; // 'issue' — which field group the employee search result should fill

/* ============================ DATA ACCESSORS ============================ */
function ppeItemsBase(){ return (typeof PPE_DATA!=='undefined' && PPE_DATA.inventory) || []; }
function ppeMatrixRows(){ return (typeof PPE_DATA!=='undefined' && PPE_DATA.matrix) || []; }
function ppeColumns(){ return (typeof PPE_DATA!=='undefined' && PPE_DATA.ppeColumns) || []; }
function ppeDepartments(){ return (typeof PPE_DATA!=='undefined' && PPE_DATA.departments) || []; }
function ppeReasons(){ return (typeof PPE_DATA!=='undefined' && PPE_DATA.reasons) || []; }
function ppeIssuedByList(){ return (typeof PPE_DATA!=='undefined' && PPE_DATA.issuedBy) || []; }
function ppeGroups(){
  var seen = {}, out = [];
  ppeColumns().forEach(function(c){ if(!seen[c.group]){ seen[c.group]=1; out.push(c.group); } });
  return out;
}

function ppeCustomItems(){ if(!safetyData.ppeCustomItems) safetyData.ppeCustomItems = []; return safetyData.ppeCustomItems; }
function ppeItemOverrides(){ if(!safetyData.ppeItemOverrides) safetyData.ppeItemOverrides = {}; return safetyData.ppeItemOverrides; }
function ppeStockTx(){ if(!safetyData.ppeStockTx) safetyData.ppeStockTx = []; return safetyData.ppeStockTx; }
function ppeIssuanceArr(){ if(!safetyData.ppeIssuance) safetyData.ppeIssuance = []; return safetyData.ppeIssuance; }

function ppeAllItems(){
  var all = ppeItemsBase().concat(ppeCustomItems());
  var ov = ppeItemOverrides();
  return all.map(function(it){
    var o = ov[it.id];
    return o ? Object.assign({}, it, o) : Object.assign({}, it);
  });
}
function ppeItemById(id){ return ppeAllItems().filter(function(i){ return i.id===id; })[0] || null; }

/* ============================== STOCK ENGINE ============================= */
function ppeReceivedExtra(itemId){
  return ppeStockTx().filter(function(t){ return t.itemId===itemId; }).reduce(function(s,t){ return s+(parseFloat(t.qty)||0); }, 0);
}
function ppeGrossIssued(itemId){
  return ppeIssuanceArr().filter(function(r){ return r.itemId===itemId; }).reduce(function(s,r){ return s+(parseFloat(r.qtyIssued)||0); }, 0);
}
function ppeReturnedReusable(itemId){
  return ppeIssuanceArr().filter(function(r){ return r.itemId===itemId && r.conditionOnReturn==='good'; }).reduce(function(s,r){ return s+(parseFloat(r.returnedQty)||0); }, 0);
}
function ppeNetIssued(itemId){
  return Math.max(0, ppeGrossIssued(itemId) - ppeReturnedReusable(itemId));
}
function ppeCurrentStock(item){
  var opening = parseFloat(item.opening)||0;
  var receivedBase = parseFloat(item.received)||0;
  var receivedExtra = ppeReceivedExtra(item.id);
  var net = ppeNetIssued(item.id);
  return opening + receivedBase + receivedExtra - net;
}
function ppeStatusFor(item){
  var stock = ppeCurrentStock(item);
  var reorder = parseFloat(item.reorderPoint)||0;
  if(stock<=0) return { code:'out', label:PPE_STATUS_LABEL.out, color:PPE_STATUS_COLOR.out, stock:stock };
  if(stock<=reorder) return { code:'reorder', label:PPE_STATUS_LABEL.reorder, color:PPE_STATUS_COLOR.reorder, stock:stock };
  if(stock<=reorder*1.5) return { code:'low', label:PPE_STATUS_LABEL.low, color:PPE_STATUS_COLOR.low, stock:stock };
  return { code:'ok', label:PPE_STATUS_LABEL.ok, color:PPE_STATUS_COLOR.ok, stock:stock };
}
function ppeActionFor(status){
  if(status.code==='out') return '🚨 URGENT: Place order immediately';
  if(status.code==='reorder') return '📋 Create PO — stock below reorder point';
  if(status.code==='low') return '📝 Monitor stock level';
  return '✅ No action needed';
}

/* ============================== NAV / SHELL ============================== */
function renderPPE(){
  var wrap = document.getElementById('ppe-body');
  if(!wrap) return;
  wrap.innerHTML =
    '<div class="trn-tabs" id="ppe-tabs">' +
      ['dashboard','matrix','inventory','issue','records','alerts','analytics'].map(function(t){
        var lbl = {dashboard:'Dashboard', matrix:'PPE Matrix', inventory:'Inventory', issue:'Issue PPE', records:'Issuance History', alerts:'Stock Alerts', analytics:'Analytics'}[t];
        return '<button type="button" class="nav-btn ppe-tab-btn'+(t===_ppeTab?' active':'')+'" onclick="ppeSetTab(\''+t+'\')" style="background:#fef2f2;color:#dc2626;font-weight:700">'+lbl+'</button>';
      }).join('') +
    '</div>' +
    '<div id="ppe-pane" class="trn-pane"></div>';
  ppeRenderPane();
}
function ppeSetTab(t){
  _ppeTab = t;
  document.querySelectorAll('.ppe-tab-btn').forEach(function(b,i){
    var tabs = ['dashboard','matrix','inventory','issue','records','alerts','analytics'];
    b.classList.toggle('active', tabs[i]===t);
  });
  ppeRenderPane();
}
function ppeRenderPane(){
  var pane = document.getElementById('ppe-pane');
  if(!pane) return;
  try{
    if(_ppeTab==='dashboard') pane.innerHTML = ppeBuildDashboard();
    else if(_ppeTab==='matrix') pane.innerHTML = ppeBuildMatrix();
    else if(_ppeTab==='inventory') pane.innerHTML = ppeBuildInventory();
    else if(_ppeTab==='issue') pane.innerHTML = ppeBuildIssueHome();
    else if(_ppeTab==='records') pane.innerHTML = ppeBuildRecords();
    else if(_ppeTab==='alerts') pane.innerHTML = ppeBuildAlerts();
    else if(_ppeTab==='analytics') pane.innerHTML = ppeBuildAnalytics();
  }catch(err){
    console.error('PPE pane render failed', err);
    pane.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⚠</div><div class="empty-state-title">PPE module unavailable</div><div class="empty-state-hint">'+escHtml(err.message||'')+'</div></div>';
  }
}

/* ================================ DASHBOARD ================================ */
function ppeMonthKey(d){ return String(d||'').slice(0,7); }
function ppeBuildDashboard(){
  if(typeof PPE_DATA==='undefined'){
    return '<div class="empty-state"><div class="empty-state-icon">🦺</div><div class="empty-state-title">PPE data not loaded</div><div class="empty-state-hint">ppe-data.js failed to load.</div></div>';
  }
  var items = ppeAllItems();
  var statuses = items.map(function(it){ return { item:it, status:ppeStatusFor(it) }; });
  var byCat = { 'PPE':0, 'First Aid':0, 'Equipment':0 };
  items.forEach(function(it){ if(byCat[it.category]!=null) byCat[it.category]++; });
  var out = statuses.filter(function(s){return s.status.code==='out';}).length;
  var reorder = statuses.filter(function(s){return s.status.code==='reorder';}).length;
  var low = statuses.filter(function(s){return s.status.code==='low';}).length;
  var ok = statuses.filter(function(s){return s.status.code==='ok';}).length;

  var thisMonth = ppeMonthKey(new Date().toISOString());
  var recs = ppeIssuanceArr();
  var issuedMonth = recs.filter(function(r){return ppeMonthKey(r.dateIssued)===thisMonth;}).reduce(function(s,r){return s+(parseFloat(r.qtyIssued)||0);},0);
  var lostMonth = recs.filter(function(r){return ppeMonthKey(r.dateIssued)===thisMonth && r.reason==='Replacement (Lost)';}).reduce(function(s,r){return s+(parseFloat(r.qtyIssued)||0);},0);
  var damagedMonth = recs.filter(function(r){return ppeMonthKey(r.dateIssued)===thisMonth && r.reason==='Replacement (Damaged)';}).reduce(function(s,r){return s+(parseFloat(r.qtyIssued)||0);},0);
  var replMonth = recs.filter(function(r){return ppeMonthKey(r.dateIssued)===thisMonth && String(r.reason||'').indexOf('Replacement')===0;}).reduce(function(s,r){return s+(parseFloat(r.qtyIssued)||0);},0);

  var kpis = [
    {l:'Total Inventory Items', v:items.length, s:'PPE + First Aid + Equipment', c:'#1e3a5f'},
    {l:'PPE Items', v:byCat['PPE'], s:'SKUs', c:'#2563eb'},
    {l:'First Aid Items', v:byCat['First Aid'], s:'SKUs', c:'#0d9488'},
    {l:'Equipment Items', v:byCat['Equipment'], s:'SKUs', c:'#7c3aed'},
    {l:'Out of Stock', v:out, s:'Need immediate action', c:out>0?PPE_STATUS_COLOR.out:'#64748b'},
    {l:'Reorder Required', v:reorder, s:'Below reorder point', c:reorder>0?PPE_STATUS_COLOR.reorder:'#64748b'},
    {l:'Low Stock', v:low, s:'Monitor', c:low>0?PPE_STATUS_COLOR.low:'#64748b'},
    {l:'Healthy Stock', v:ok, s:'OK', c:PPE_STATUS_COLOR.ok},
    {l:'Issued This Month', v:issuedMonth, s:'Units', c:'#2563eb'},
    {l:'Lost This Month', v:lostMonth, s:'Units', c:lostMonth>0?'#dc2626':'#64748b'},
    {l:'Damaged This Month', v:damagedMonth, s:'Units', c:damagedMonth>0?'#d97706':'#64748b'},
    {l:'Replacements This Month', v:replMonth, s:'Units', c:'#7c3aed'}
  ];

  var stockDonut = [['OK', ok, PPE_STATUS_COLOR.ok], ['Low Stock', low, PPE_STATUS_COLOR.low], ['Reorder Now', reorder, PPE_STATUS_COLOR.reorder], ['Out of Stock', out, PPE_STATUS_COLOR.out]].filter(function(d){return d[1]>0;});

  var catBars = PPE_CATEGORIES.map(function(cat){
    var catItems = statuses.filter(function(s){return s.item.category===cat;});
    var healthy = catItems.filter(function(s){return s.status.code==='ok';}).length;
    return [cat, catItems.length ? Math.round(healthy/catItems.length*100) : 0];
  });
  var catColors = catBars.map(function(c){ return c[1]>=80?'#16a34a':c[1]>=50?'#d97706':'#dc2626'; });

  var monthly = ppeLastNMonthsIssuance(6);
  var monthlyTrend = monthly.map(function(m){ return [m.key, m.total]; });

  var main = '<div class="pbi-layout">';
  main += portalBiSideNav('PPE Modules', [
    {key:'all', label:'Overview', val:''},
    {key:'matrix', label:'PPE Matrix', view:'ppe', val:ppeMatrixRows().length},
    {key:'inventory', label:'Inventory', view:'ppe', val:items.length},
    {key:'alerts', label:'Stock Alerts', view:'ppe', val:out+reorder+low},
    {key:'records', label:'Issuance History', view:'ppe', val:recs.length}
  ], 'ppe');
  main += '<div class="pbi-main">'+portalBiProdKpis(kpis.slice(0,4))+portalBiProdKpis(kpis.slice(4,8))+portalBiProdKpis(kpis.slice(8,12));
  main += '<div class="pbi-grid-2">';
  main += '<div class="pbi-card"><div class="pbi-card-title">Stock Health Overview</div>'+(typeof buildDonutChart==='function'?buildDonutChart(stockDonut, out+reorder+low+ok):'')+'</div>';
  main += '<div class="pbi-card"><div class="pbi-card-title">Health % by Category</div>'+(typeof buildBarChart==='function'?buildBarChart(catBars, catColors):'')+'</div>';
  main += '</div>';
  main += '<div class="pbi-card"><div class="pbi-card-title">Monthly Issuance Trend (6 Months)</div>'+(typeof buildTrendChart==='function'?buildTrendChart(monthlyTrend):'')+'</div>';
  main += '</div></div>';

  return portalBiShell({
    theme:'safety',
    title:'PPE Management Dashboard',
    tabsHtml:'<button type="button" class="pbi-tab active">PPE Overview</button><button type="button" class="pbi-tab" onclick="ppeSetTab(\'matrix\')">Matrix</button><button type="button" class="pbi-tab" onclick="ppeSetTab(\'alerts\')">Stock Alerts</button>',
    body: main,
    footer: 'PPE Management · Requirement Matrix · Inventory · Issuance · Stock Alerts — live calculated data'
  });
}
function ppeLastNMonthsIssuance(n){
  var out = [], now = new Date();
  for(var i=n-1;i>=0;i--){
    var d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    out.push({ key:d.toISOString().slice(0,7), total:0, newIssue:0, replacement:0, lost:0, damaged:0, depts:{} });
  }
  var map = {}; out.forEach(function(m){ map[m.key]=m; });
  ppeIssuanceArr().forEach(function(r){
    var k = ppeMonthKey(r.dateIssued);
    var m = map[k];
    if(!m) return;
    var qty = parseFloat(r.qtyIssued)||0;
    m.total += qty;
    if(r.reason==='New Issue') m.newIssue += qty; else m.replacement += qty;
    if(r.reason==='Replacement (Lost)') m.lost += qty;
    if(r.reason==='Replacement (Damaged)') m.damaged += qty;
    if(r.department) m.depts[r.department] = 1;
  });
  out.forEach(function(m){ m.activeDepts = Object.keys(m.depts).length; });
  return out;
}

/* ================================= PPE MATRIX ================================= */
function ppeFilteredColumns(){
  var f = _ppeMatrixFilter;
  return ppeColumns().filter(function(c){ return f.group==='all' || c.group===f.group; });
}
function ppeFilteredMatrixRows(){
  var f = _ppeMatrixFilter;
  var cols = ppeFilteredColumns();
  return ppeMatrixRows().filter(function(row){
    if(f.q && row.task.toLowerCase().indexOf(f.q.toLowerCase())===-1) return false;
    if(f.mandatoryOnly && !cols.some(function(c){return row.requirements[c.key]==='M';})) return false;
    if(f.recommendedOnly && !cols.some(function(c){return row.requirements[c.key]==='R';})) return false;
    return true;
  });
}
function ppeMatrixMark(v){
  if(v==='M') return '<span class="ppe-mark ppe-mark-m" title="Mandatory">M</span>';
  if(v==='R') return '<span class="ppe-mark ppe-mark-r" title="Recommended">R</span>';
  return '<span class="ppe-mark ppe-mark-n" title="Not Required">—</span>';
}
function ppeBuildMatrix(){
  if(typeof PPE_DATA==='undefined') return '<div class="empty-state"><div class="empty-state-title">PPE data not loaded</div></div>';
  var f = _ppeMatrixFilter;
  var groupOpts = ['<option value="all">All Categories</option>'].concat(ppeGroups().map(function(g){
    return '<option value="'+escHtml(g)+'"'+(f.group===g?' selected':'')+'>'+escHtml(g)+'</option>';
  })).join('');

  var head = '<div class="trn-toolbar"><div class="page-title" style="margin:0">PPE Requirement Matrix</div>'
    + '<span class="empty-state-hint" style="margin-left:6px">'+ppeMatrixRows().length+' tasks/areas · '+ppeColumns().length+' PPE items</span></div>'
    + '<div class="trn-filters ppe-matrix-filters-desktop">'
      + '<input type="text" placeholder="Search Task / Area…" value="'+escHtml(f.q)+'" oninput="ppeMatrixFilterChange(\'q\',this.value)"/>'
      + '<select onchange="ppeMatrixFilterChange(\'group\',this.value)">'+groupOpts+'</select>'
      + '<label class="trn-inline-check"><input type="checkbox" '+(f.mandatoryOnly?'checked':'')+' onchange="ppeMatrixFilterChange(\'mandatoryOnly\',this.checked)"/> Mandatory only</label>'
      + '<label class="trn-inline-check"><input type="checkbox" '+(f.recommendedOnly?'checked':'')+' onchange="ppeMatrixFilterChange(\'recommendedOnly\',this.checked)"/> Recommended only</label>'
    + '</div>'
    + '<div class="trn-legend">'
      + '<span class="trn-legend-item">'+ppeMatrixMark('M')+' Mandatory — must wear before entering area</span>'
      + '<span class="trn-legend-item">'+ppeMatrixMark('R')+' Recommended — wear based on task risk</span>'
      + '<span class="trn-legend-item">'+ppeMatrixMark('-')+' Not Required</span>'
    + '</div>';

  // ---- Mobile: Task/Area picker -> Mandatory/Recommended card lists ----
  var allTasks = ppeMatrixRows();
  var mobileTaskOpts = ['<option value="">— Select a Task / Area —</option>'].concat(allTasks.map(function(t){
    return '<option value="'+escHtml(t.task)+'"'+(_ppeMobileTask===t.task?' selected':'')+'>'+escHtml(t.task)+'</option>';
  })).join('');
  var mobileBody = '<div class="ppe-mobile-matrix"><div class="form-row"><label>Select Task / Area</label><select onchange="ppeSetMobileTask(this.value)">'+mobileTaskOpts+'</select></div>';
  var selRow = allTasks.filter(function(t){return t.task===_ppeMobileTask;})[0];
  if(selRow){
    var mand = [], rec = [];
    ppeColumns().forEach(function(c){
      var v = selRow.requirements[c.key];
      if(v==='M') mand.push(c.name);
      else if(v==='R') rec.push(c.name);
    });
    mobileBody += '<div class="ppe-req-card ppe-req-mandatory"><div class="ppe-req-card-title">Mandatory PPE</div>'
      + (mand.length ? mand.map(function(n){return '<div class="ppe-req-item">'+ppeMatrixMark('M')+' '+escHtml(n)+'</div>';}).join('') : '<div class="empty-state-hint">None</div>')
      + '</div>';
    mobileBody += '<div class="ppe-req-card ppe-req-recommended"><div class="ppe-req-card-title">Recommended PPE</div>'
      + (rec.length ? rec.map(function(n){return '<div class="ppe-req-item">'+ppeMatrixMark('R')+' '+escHtml(n)+'</div>';}).join('') : '<div class="empty-state-hint">None</div>')
      + '</div>';
  } else {
    mobileBody += '<div class="empty-state empty-state-sm">Select a task above to see its required PPE.</div>';
  }
  mobileBody += '</div>';

  // ---- Desktop: full grouped table ----
  var cols = ppeFilteredColumns();
  var rows = ppeFilteredMatrixRows();
  var groupHeaderCells = '';
  var i = 0;
  while(i < cols.length){
    var g = cols[i].group, span = 0;
    while(i+span < cols.length && cols[i+span].group===g) span++;
    groupHeaderCells += '<th colspan="'+span+'" class="ppe-group-th">'+escHtml(g)+'</th>';
    i += span;
  }
  var itemHeaderCells = cols.map(function(c){ return '<th class="ppe-item-th" title="'+escHtml(c.name)+'">'+escHtml(c.name)+'</th>'; }).join('');
  var bodyRows = rows.map(function(r){
    var cells = cols.map(function(c){ return '<td class="ppe-mark-cell">'+ppeMatrixMark(r.requirements[c.key])+'</td>'; }).join('');
    return '<tr><td class="trn-sticky-col ppe-sticky-task" title="'+escHtml(r.task)+'">'+escHtml(r.task)+'</td>'+cells+'</tr>';
  }).join('');
  var desktopTable = rows.length
    ? '<div class="trn-matrix-wrap ppe-matrix-wrap"><table class="trn-matrix-table ppe-matrix-table"><thead>'
      + '<tr class="ppe-group-row"><th class="trn-sticky-col ppe-sticky-task" rowspan="2">Task / Area</th>'+groupHeaderCells+'</tr>'
      + '<tr class="ppe-item-row">'+itemHeaderCells+'</tr>'
      + '</thead><tbody>'+bodyRows+'</tbody></table></div>'
    : '<div class="empty-state"><div class="empty-state-icon">🔎</div><div class="empty-state-title">No tasks match this filter</div></div>';

  return head
    + '<div class="ppe-matrix-desktop-only">'+desktopTable+'</div>'
    + '<div class="ppe-matrix-mobile-only">'+mobileBody+'</div>';
}
function ppeMatrixFilterChange(key, val){
  if(key==='mandatoryOnly' || key==='recommendedOnly') _ppeMatrixFilter[key] = !!val;
  else _ppeMatrixFilter[key] = val;
  ppeRenderPane();
}
function ppeSetMobileTask(task){ _ppeMobileTask = task || null; ppeRenderPane(); }

/* ================================= INVENTORY ================================= */
function ppeFilteredItems(){
  var f = _ppeInvFilter;
  return ppeAllItems().filter(function(it){
    if(f.category!=='all' && it.category!==f.category) return false;
    if(f.q){
      var q = f.q.toLowerCase();
      if((it.id||'').toLowerCase().indexOf(q)===-1 && (it.name||'').toLowerCase().indexOf(q)===-1) return false;
    }
    if(f.status!=='all' && ppeStatusFor(it).code!==f.status) return false;
    return true;
  }).sort(function(a,b){ return a.id.localeCompare(b.id, undefined, {numeric:true}); });
}
function ppeBuildInventory(){
  if(typeof PPE_DATA==='undefined') return '<div class="empty-state"><div class="empty-state-title">PPE data not loaded</div></div>';
  var f = _ppeInvFilter;
  var items = ppeFilteredItems();
  var catOpts = ['<option value="all">All Categories</option>'].concat(PPE_CATEGORIES.map(function(c){
    return '<option value="'+escHtml(c)+'"'+(f.category===c?' selected':'')+'>'+escHtml(c)+'</option>';
  })).join('');
  var statusOpts = ['all','ok','low','reorder','out'].map(function(s){
    var lbl = s==='all'?'All Statuses':PPE_STATUS_LABEL[s];
    return '<option value="'+s+'"'+(f.status===s?' selected':'')+'>'+lbl+'</option>';
  }).join('');

  var head = '<div class="trn-toolbar"><div class="page-title" style="margin:0">PPE Inventory</div>'
    + '<span class="empty-state-hint" style="margin-left:6px">'+items.length+' item(s)</span>'
    + '<div class="trn-toolbar-actions">'
      + '<button type="button" class="btn-ghost" onclick="ppeExportInventory()">Export Inventory</button>'
      + '<button type="button" class="btn-primary" onclick="ppeOpenAddItem()">+ Add Inventory Item</button>'
    + '</div></div>'
    + '<div class="trn-filters">'
      + '<input type="text" placeholder="Search Item ID or Name…" value="'+escHtml(f.q)+'" oninput="ppeInvFilterChange(\'q\',this.value)"/>'
      + '<select onchange="ppeInvFilterChange(\'category\',this.value)">'+catOpts+'</select>'
      + '<select onchange="ppeInvFilterChange(\'status\',this.value)">'+statusOpts+'</select>'
    + '</div>';

  if(!items.length){
    return head + '<div class="empty-state"><div class="empty-state-icon">📦</div><div class="empty-state-title">No items match this filter</div></div>';
  }

  var rows = items.map(function(it){
    var st = ppeStatusFor(it);
    return '<div class="pro-list-card ppe-inv-card">'
      + '<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">'
        + '<div><div style="font-weight:800">'+escHtml(it.id)+' — '+escHtml(it.name)+'</div>'
        + '<div class="empty-state-hint">'+escHtml(it.category)+' · Unit: '+escHtml(it.unit||'—')+' · Current Stock: <b>'+st.stock+'</b> '+escHtml(it.unit||'')+' · Reorder @ '+escHtml(String(it.reorderPoint))+' · Max '+escHtml(String(it.maxStock))+'</div></div>'
        + '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">'
          + '<span class="ppe-status-pill" style="background:'+st.color+'22;color:'+st.color+'">'+st.label+'</span>'
          + '<button type="button" class="btn-ghost" onclick="ppeOpenReceive(\''+it.id+'\')">Receive Stock</button>'
          + '<button type="button" class="btn-ghost" onclick="ppeOpenEditItem(\''+it.id+'\')">Edit</button>'
          + '<button type="button" class="btn-ghost" onclick="ppeOpenItemHistory(\''+it.id+'\')">History</button>'
        + '</div>'
      + '</div></div>';
  }).join('');
  return head + rows;
}
function ppeInvFilterChange(key, val){ _ppeInvFilter[key] = val; ppeRenderPane(); }

function ppeOpenAddItem(){
  document.getElementById('ppe-item-modal-title').textContent = 'Add Inventory Item';
  document.getElementById('ppe-item-id-hidden').value = '';
  var idEl = document.getElementById('ppe-item-id'); idEl.value = ''; idEl.removeAttribute('readonly');
  document.getElementById('ppe-item-name').value = '';
  document.getElementById('ppe-item-category').value = 'PPE';
  document.getElementById('ppe-item-unit').value = '';
  document.getElementById('ppe-item-opening').value = '0';
  document.getElementById('ppe-item-reorder').value = '';
  document.getElementById('ppe-item-max').value = '';
  document.getElementById('ppe-item-notes').value = '';
  document.getElementById('ppe-item-modal').classList.add('open');
}
function ppeOpenEditItem(itemId){
  var item = ppeItemById(itemId);
  if(!item){ showToast('Item not found','red'); return; }
  document.getElementById('ppe-item-modal-title').textContent = 'Edit Inventory Item';
  document.getElementById('ppe-item-id-hidden').value = itemId;
  var idEl = document.getElementById('ppe-item-id'); idEl.value = item.id; idEl.setAttribute('readonly','readonly');
  document.getElementById('ppe-item-name').value = item.name;
  document.getElementById('ppe-item-category').value = item.category;
  document.getElementById('ppe-item-unit').value = item.unit;
  document.getElementById('ppe-item-opening').value = item.opening;
  document.getElementById('ppe-item-reorder').value = item.reorderPoint;
  document.getElementById('ppe-item-max').value = item.maxStock;
  document.getElementById('ppe-item-notes').value = item.notes||'';
  document.getElementById('ppe-item-modal').classList.add('open');
}
function ppeSaveItem(){
  var hiddenId = document.getElementById('ppe-item-id-hidden').value;
  var id = document.getElementById('ppe-item-id').value.trim();
  var name = document.getElementById('ppe-item-name').value.trim();
  if(!id || !name){ showToast('Item ID and Name are required','red'); return; }
  var category = document.getElementById('ppe-item-category').value;
  var unit = document.getElementById('ppe-item-unit').value.trim();
  var opening = parseFloat(document.getElementById('ppe-item-opening').value)||0;
  var reorder = parseFloat(document.getElementById('ppe-item-reorder').value)||0;
  var max = parseFloat(document.getElementById('ppe-item-max').value)||0;
  var notes = document.getElementById('ppe-item-notes').value.trim();

  if(hiddenId){
    ppeItemOverrides()[hiddenId] = { name:name, category:category, unit:unit, reorderPoint:reorder, maxStock:max, notes:notes };
  } else {
    if(ppeItemById(id)){ showToast('Item ID already exists','red'); return; }
    ppeCustomItems().push({ id:id, name:name, category:category, unit:unit, opening:opening, received:0, reorderPoint:reorder, maxStock:max, notes:notes, createdAt:new Date().toISOString() });
  }
  saveState();
  document.getElementById('ppe-item-modal').classList.remove('open');
  showToast('Inventory item saved','green');
  ppeRenderPane();
}

function ppeOpenReceive(itemId){
  var item = ppeItemById(itemId);
  if(!item){ showToast('Item not found','red'); return; }
  document.getElementById('ppe-receive-itemid').value = itemId;
  document.getElementById('ppe-receive-itemlabel').textContent = item.id+' — '+item.name;
  document.getElementById('ppe-receive-date').value = new Date().toISOString().slice(0,10);
  document.getElementById('ppe-receive-qty').value = '';
  document.getElementById('ppe-receive-ref').value = '';
  document.getElementById('ppe-receive-notes').value = '';
  document.getElementById('ppe-receive-by').innerHTML = ppeIssuedByList().map(function(n){ return '<option value="'+escHtml(n)+'">'+escHtml(n)+'</option>'; }).join('');
  document.getElementById('ppe-receive-modal').classList.add('open');
}
function ppeSaveReceive(){
  var itemId = document.getElementById('ppe-receive-itemid').value;
  var item = ppeItemById(itemId);
  if(!item){ showToast('Item not found','red'); return; }
  var qty = parseFloat(document.getElementById('ppe-receive-qty').value);
  if(!qty || qty<=0){ showToast('Enter a valid quantity','red'); return; }
  var date = document.getElementById('ppe-receive-date').value || new Date().toISOString().slice(0,10);
  var by = document.getElementById('ppe-receive-by').value;
  var ref = document.getElementById('ppe-receive-ref').value.trim();
  var notes = document.getElementById('ppe-receive-notes').value.trim();
  ppeStockTx().push({ id:'PPER-'+Date.now()+'-'+Math.random().toString(36).slice(2,7), itemId:itemId, qty:qty, date:date, receivedBy:by, ref:ref, notes:notes, timestamp:new Date().toISOString(), loggedBy:(currentUser&&currentUser.name)||'' });
  saveState();
  document.getElementById('ppe-receive-modal').classList.remove('open');
  showToast('Stock received — '+qty+' '+(item.unit||'')+' added to '+item.name, 'green');
  ppeRenderPane();
}

function ppeOpenItemHistory(itemId){
  var item = ppeItemById(itemId);
  if(!item){ showToast('Item not found','red'); return; }
  var st = ppeStatusFor(item);
  var receipts = ppeStockTx().filter(function(t){return t.itemId===itemId;}).sort(function(a,b){return new Date(b.date)-new Date(a.date);});
  var issues = ppeIssuanceArr().filter(function(r){return r.itemId===itemId;}).sort(function(a,b){return new Date(b.dateIssued)-new Date(a.dateIssued);});
  var receiptRows = receipts.map(function(t){
    return '<tr><td style="text-align:left">'+escHtml(t.date)+'</td><td>'+t.qty+'</td><td>'+escHtml(t.receivedBy||'')+'</td><td>'+escHtml(t.ref||'—')+'</td></tr>';
  }).join('');
  var issueRows = issues.map(function(r){
    return '<tr><td style="text-align:left">'+escHtml(r.dateIssued)+'</td><td>'+escHtml(r.employeeName||'')+'</td><td>'+escHtml(r.department||'')+'</td><td>'+escHtml(r.reason||'')+'</td><td>'+r.qtyIssued+'</td></tr>';
  }).join('');
  var body = '<div class="nm-form-grid">'
    + '<div class="form-row"><label>Item</label><div style="padding:6px 0;font-weight:700">'+escHtml(item.id)+' — '+escHtml(item.name)+'</div></div>'
    + '<div class="form-row"><label>Category</label><div style="padding:6px 0">'+escHtml(item.category)+'</div></div>'
    + '<div class="form-row"><label>Current Stock</label><div style="padding:6px 0;font-weight:800;color:'+st.color+'">'+st.stock+' '+escHtml(item.unit||'')+' — '+st.label+'</div></div>'
    + '<div class="form-row"><label>Opening Balance</label><div style="padding:6px 0">'+item.opening+'</div></div>'
    + '</div>'
    + '<div class="pbi-card-title" style="margin-top:10px">Receive Stock History</div>'
    + '<div style="overflow:auto"><table class="pbi-table"><thead><tr><th style="text-align:left;background:#1e3a5f">Date</th><th style="background:#1e3a5f">Qty</th><th style="background:#1e3a5f">Received By</th><th style="background:#1e3a5f">Ref/PO</th></tr></thead><tbody>'+(receiptRows||'<tr><td colspan="4">No receipts logged yet</td></tr>')+'</tbody></table></div>'
    + '<div class="pbi-card-title" style="margin-top:14px">Issuance History</div>'
    + '<div style="overflow:auto"><table class="pbi-table"><thead><tr><th style="text-align:left;background:#1e3a5f">Date</th><th style="background:#1e3a5f">Employee</th><th style="background:#1e3a5f">Department</th><th style="background:#1e3a5f">Reason</th><th style="background:#1e3a5f">Qty</th></tr></thead><tbody>'+(issueRows||'<tr><td colspan="5">No issuance logged yet</td></tr>')+'</tbody></table></div>';
  ppeOpenDetailModal('Item History — '+item.id, body);
}

function ppeOpenDetailModal(title, bodyHtml){
  var modal = document.getElementById('ppe-detail-modal');
  if(!modal) return;
  document.getElementById('ppe-detail-title').textContent = title;
  document.getElementById('ppe-detail-body').innerHTML = bodyHtml;
  modal.classList.add('open');
}

/* ================================= ISSUE PPE ================================= */
function ppeBuildIssueHome(){
  var recs = ppeIssuanceArr();
  var thisMonth = ppeMonthKey(new Date().toISOString());
  var monthCount = recs.filter(function(r){return ppeMonthKey(r.dateIssued)===thisMonth;}).length;
  return '<div class="page-title" style="margin-bottom:2px">Issue PPE</div>'
    + '<div class="page-sub">Record every item given to an employee — inventory updates automatically</div>'
    + '<div class="pbi-card" style="margin-top:14px;max-width:420px">'
      + '<div class="pbi-card-title">New Issuance</div>'
      + '<div class="empty-state-hint" style="margin-bottom:12px">'+recs.length+' record(s) on file · '+monthCount+' this month</div>'
      + '<button type="button" class="btn-primary" onclick="ppeOpenIssueModal()">+ Issue PPE / First Aid / Equipment</button>'
    + '</div>';
}
function ppeItemSelectOptions(selected){
  var items = ppeAllItems().slice().sort(function(a,b){ return a.id.localeCompare(b.id, undefined, {numeric:true}); });
  var opts = '<option value="">— Select an item —</option>';
  var byCat = {};
  items.forEach(function(it){ (byCat[it.category]=byCat[it.category]||[]).push(it); });
  PPE_CATEGORIES.forEach(function(cat){
    if(!byCat[cat]) return;
    opts += '<optgroup label="'+escHtml(cat)+'">' + byCat[cat].map(function(it){
      var st = ppeStatusFor(it);
      return '<option value="'+escHtml(it.id)+'"'+(selected===it.id?' selected':'')+'>'+escHtml(it.id)+' — '+escHtml(it.name)+' ('+st.stock+' '+escHtml(it.unit||'')+' avail.)</option>';
    }).join('') + '</optgroup>';
  });
  return opts;
}
function ppeOpenIssueModal(record){
  _ppeEditingIssuanceId = record ? record.id : null;
  document.getElementById('ppe-issue-modal-title').textContent = record ? 'Edit PPE Issuance' : 'Issue PPE';
  document.getElementById('ppe-issue-item').innerHTML = ppeItemSelectOptions(record ? record.itemId : '');
  document.getElementById('ppe-issue-date').value = record ? record.dateIssued : new Date().toISOString().slice(0,10);
  document.getElementById('ppe-issue-qty').value = record ? record.qtyIssued : '';
  document.getElementById('ppe-issue-empid').value = record ? (record.employeeId||'') : '';
  document.getElementById('ppe-issue-empname').value = record ? (record.employeeName||'') : '';
  document.getElementById('ppe-issue-emp-search').value = '';
  document.getElementById('ppe-issue-emp-results').style.display = 'none';
  document.getElementById('ppe-issue-dept').innerHTML = ppeDepartments().map(function(d){ return '<option value="'+escHtml(d)+'"'+(record&&record.department===d?' selected':'')+'>'+escHtml(d)+'</option>'; }).join('');
  document.getElementById('ppe-issue-reason').innerHTML = ppeReasons().map(function(r){ return '<option value="'+escHtml(r)+'"'+(record&&record.reason===r?' selected':'')+'>'+escHtml(r)+'</option>'; }).join('');
  document.getElementById('ppe-issue-issuedby').innerHTML = ppeIssuedByList().map(function(n){ return '<option value="'+escHtml(n)+'"'+(record&&record.issuedBy===n?' selected':'')+'>'+escHtml(n)+'</option>'; }).join('');
  document.getElementById('ppe-issue-returndate').value = record ? (record.returnDate||'') : '';
  document.getElementById('ppe-issue-returnqty').value = record && record.returnedQty ? record.returnedQty : '';
  document.getElementById('ppe-issue-condition').value = record ? (record.conditionOnReturn||'') : '';
  ppeIssueItemChange();
  ppeIssueReasonChange();
  document.getElementById('ppe-issue-modal').classList.add('open');
}
function ppeCloseIssueModal(){
  document.getElementById('ppe-issue-modal').classList.remove('open');
  _ppeEditingIssuanceId = null;
}
function ppeIssueItemChange(){
  var itemId = document.getElementById('ppe-issue-item').value;
  var item = ppeItemById(itemId);
  document.getElementById('ppe-issue-itemname').value = item ? item.name : '';
  document.getElementById('ppe-issue-available').value = item ? (ppeCurrentStock(item)+' '+(item.unit||'')) : '';
  ppeValidateStock();
}
function ppeIssueReasonChange(){
  var reason = document.getElementById('ppe-issue-reason').value;
  document.getElementById('ppe-issue-loan-fields').style.display = (reason==='Temporary Loan') ? 'block' : 'none';
}
function ppeValidateStock(){
  var itemId = document.getElementById('ppe-issue-item').value;
  var item = ppeItemById(itemId);
  var qty = parseFloat(document.getElementById('ppe-issue-qty').value) || 0;
  var warn = document.getElementById('ppe-issue-stock-warning');
  var saveBtn = document.getElementById('ppe-issue-save-btn');
  if(!item){ warn.innerHTML=''; saveBtn.disabled=false; return; }
  var available = ppeCurrentStock(item);
  if(qty > available){
    warn.innerHTML = '<div class="ppe-stock-warning">⚠ Insufficient stock — Available: <b>'+available+'</b>, Requested: <b>'+qty+'</b>. Reduce the quantity or receive more stock first.</div>';
    saveBtn.disabled = true;
  } else {
    warn.innerHTML = '';
    saveBtn.disabled = false;
  }
}
function ppeIssueEmpSearch(q){
  var box = document.getElementById('ppe-issue-emp-results');
  if(!q || q.length<2 || typeof TRAINING_DATA==='undefined'){ box.style.display='none'; box.innerHTML=''; return; }
  var ql = q.toLowerCase();
  var matches = TRAINING_DATA.employees.filter(function(e){
    return e.active!==false && ((e.name||'').toLowerCase().indexOf(ql)>=0 || (e.id||'').toLowerCase().indexOf(ql)>=0);
  }).slice(0, 15);
  if(!matches.length){ box.style.display='none'; box.innerHTML=''; return; }
  box.innerHTML = matches.map(function(e){
    return '<div class="trn-pick-row" style="cursor:pointer" onclick="ppePickEmployee(\''+e.id.replace(/'/g,"\\'")+'\')"><b>'+escHtml(e.name)+'</b><span class="trn-sub">'+escHtml(e.id)+' · '+escHtml(e.department)+' · '+escHtml(e.jobTitle)+'</span></div>';
  }).join('');
  box.style.display = 'block';
}
function ppePickEmployee(empId){
  var emp = TRAINING_DATA.employees.filter(function(e){ return e.id===empId; })[0];
  if(!emp) return;
  document.getElementById('ppe-issue-empid').value = emp.id;
  document.getElementById('ppe-issue-empname').value = emp.name;
  var deptSel = document.getElementById('ppe-issue-dept');
  if([].slice.call(deptSel.options).some(function(o){return o.value===emp.department;})) deptSel.value = emp.department;
  document.getElementById('ppe-issue-emp-search').value = '';
  document.getElementById('ppe-issue-emp-results').style.display = 'none';
}
function ppeNextRefNo(){
  return 'ISS-' + String(ppeIssuanceArr().length + 1).padStart(5, '0');
}
function ppeSaveIssuance(){
  var itemId = document.getElementById('ppe-issue-item').value;
  var item = ppeItemById(itemId);
  if(!item){ showToast('Select an item','red'); return; }
  var qty = parseFloat(document.getElementById('ppe-issue-qty').value);
  if(!qty || qty<=0){ showToast('Enter a valid quantity','red'); return; }
  var available = ppeCurrentStock(item);
  // When editing, this item's own previous quantity is already included in "available" via the
  // stock engine reading ppeIssuanceArr() live — so re-validate against the record being replaced.
  var editingQty = 0;
  if(_ppeEditingIssuanceId){
    var existing = ppeIssuanceArr().filter(function(r){return r.id===_ppeEditingIssuanceId;})[0];
    if(existing && existing.itemId===itemId) editingQty = parseFloat(existing.qtyIssued)||0;
  }
  if(qty > available + editingQty){
    showToast('Insufficient stock — available '+(available+editingQty)+', requested '+qty, 'red');
    return;
  }
  var date = document.getElementById('ppe-issue-date').value;
  if(!date){ showToast('Date Issued is required','red'); return; }
  var empId = document.getElementById('ppe-issue-empid').value.trim();
  var empName = document.getElementById('ppe-issue-empname').value.trim();
  if(!empName){ showToast('Employee Name is required','red'); return; }
  var dept = document.getElementById('ppe-issue-dept').value;
  var reason = document.getElementById('ppe-issue-reason').value;
  var issuedBy = document.getElementById('ppe-issue-issuedby').value;
  var returnDate = document.getElementById('ppe-issue-returndate').value;
  var returnQtyRaw = document.getElementById('ppe-issue-returnqty').value;
  var condition = document.getElementById('ppe-issue-condition').value;

  var rec = _ppeEditingIssuanceId ? ppeIssuanceArr().filter(function(r){return r.id===_ppeEditingIssuanceId;})[0] : null;
  var isNew = !rec;
  if(isNew){
    rec = { id:'PPEI-'+Date.now()+'-'+Math.random().toString(36).slice(2,7), refNo:ppeNextRefNo(), createdAt:new Date().toISOString(), createdBy:(currentUser&&currentUser.name)||'', history:[] };
    ppeIssuanceArr().unshift(rec);
  } else {
    rec.history = rec.history || [];
    rec.history.push({ at:new Date().toISOString(), by:(currentUser&&currentUser.name)||'', action:'edited' });
  }
  rec.dateIssued = date; rec.itemId = itemId; rec.itemName = item.name; rec.category = item.category;
  rec.employeeId = empId; rec.employeeName = empName; rec.qtyIssued = qty;
  rec.department = dept; rec.reason = reason;
  rec.returnDate = returnDate || ''; rec.returnedQty = returnQtyRaw ? parseFloat(returnQtyRaw) : 0;
  rec.conditionOnReturn = condition || '';
  rec.issuedBy = issuedBy;
  rec.timestamp = rec.timestamp || new Date().toISOString();
  rec.loggedBy = (currentUser&&currentUser.name)||'';

  saveState();
  var wasNew = isNew;
  _ppeEditingIssuanceId = null;
  document.getElementById('ppe-issue-modal').classList.remove('open');
  showToast(wasNew ? 'PPE issued — inventory updated' : 'Issuance updated', 'green');
  ppeSetTab('records');
}

/* ================================= ISSUANCE HISTORY ================================= */
function ppeFilteredRecords(){
  var f = _ppeRecordsFilter;
  return ppeIssuanceArr().filter(function(r){
    if(f.dept!=='all' && r.department!==f.dept) return false;
    if(f.category!=='all' && r.category!==f.category) return false;
    if(f.reason!=='all' && r.reason!==f.reason) return false;
    if(f.issuedBy!=='all' && r.issuedBy!==f.issuedBy) return false;
    if(f.dateFrom && r.dateIssued < f.dateFrom) return false;
    if(f.dateTo && r.dateIssued > f.dateTo) return false;
    if(f.q){
      var q = f.q.toLowerCase();
      var hay = [r.employeeId, r.employeeName, r.itemId, r.itemName, r.refNo].join(' ').toLowerCase();
      if(hay.indexOf(q)===-1) return false;
    }
    return true;
  }).sort(function(a,b){ return new Date(b.dateIssued||b.timestamp||0) - new Date(a.dateIssued||a.timestamp||0); });
}
function ppeBuildRecords(){
  var f = _ppeRecordsFilter;
  var recs = ppeFilteredRecords();
  var deptOpts = ['<option value="all">All Departments</option>'].concat(ppeDepartments().map(function(d){ return '<option value="'+escHtml(d)+'"'+(f.dept===d?' selected':'')+'>'+escHtml(d)+'</option>'; })).join('');
  var catOpts = ['<option value="all">All Categories</option>'].concat(PPE_CATEGORIES.map(function(c){ return '<option value="'+escHtml(c)+'"'+(f.category===c?' selected':'')+'>'+escHtml(c)+'</option>'; })).join('');
  var reasonOpts = ['<option value="all">All Reasons</option>'].concat(ppeReasons().map(function(r){ return '<option value="'+escHtml(r)+'"'+(f.reason===r?' selected':'')+'>'+escHtml(r)+'</option>'; })).join('');
  var byOpts = ['<option value="all">All — Issued By</option>'].concat(ppeIssuedByList().map(function(n){ return '<option value="'+escHtml(n)+'"'+(f.issuedBy===n?' selected':'')+'>'+escHtml(n)+'</option>'; })).join('');

  var head = '<div class="trn-toolbar"><div class="page-title" style="margin:0">Issuance History</div>'
    + '<span class="empty-state-hint" style="margin-left:6px">'+recs.length+' record(s)</span>'
    + '<div class="trn-toolbar-actions">'
      + '<button type="button" class="btn-ghost" onclick="ppeExportIssuance()">Export</button>'
      + '<button type="button" class="btn-primary" onclick="ppeOpenIssueModal()">+ Issue PPE</button>'
    + '</div></div>'
    + '<div class="trn-filters">'
      + '<input type="text" placeholder="Search employee, item, ref#…" value="'+escHtml(f.q)+'" oninput="ppeRecordsFilterChange(\'q\',this.value)"/>'
      + '<select onchange="ppeRecordsFilterChange(\'dept\',this.value)">'+deptOpts+'</select>'
      + '<select onchange="ppeRecordsFilterChange(\'category\',this.value)">'+catOpts+'</select>'
      + '<select onchange="ppeRecordsFilterChange(\'reason\',this.value)">'+reasonOpts+'</select>'
      + '<select onchange="ppeRecordsFilterChange(\'issuedBy\',this.value)">'+byOpts+'</select>'
      + '<input type="date" value="'+escHtml(f.dateFrom)+'" onchange="ppeRecordsFilterChange(\'dateFrom\',this.value)" title="From date"/>'
      + '<input type="date" value="'+escHtml(f.dateTo)+'" onchange="ppeRecordsFilterChange(\'dateTo\',this.value)" title="To date"/>'
      + '<button type="button" class="btn-ghost" onclick="ppeOpenEmployeeHistorySearch()">Employee PPE History</button>'
    + '</div>';

  if(!recs.length){
    return head + '<div class="empty-state"><div class="empty-state-icon">🗂</div><div class="empty-state-title">No issuance records yet</div><div class="empty-state-hint">Use "+ Issue PPE" to log the first one.</div></div>';
  }
  var rows = recs.map(function(r){
    return '<div class="pro-list-card">'
      + '<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">'
        + '<div><div style="font-weight:800">'+escHtml(r.refNo||'')+' — '+escHtml(r.itemName||r.itemId)+'</div>'
        + '<div class="empty-state-hint">'+escHtml(r.dateIssued||'')+' · '+escHtml(r.employeeName||'')+' ('+escHtml(r.employeeId||'—')+') · '+escHtml(r.department||'')+' · '+escHtml(r.reason||'')+' · Qty '+r.qtyIssued+'</div></div>'
        + '<div style="display:flex;gap:6px;flex-wrap:wrap">'
          + '<button type="button" class="btn-ghost" onclick="ppeOpenRecordView(\''+r.id+'\')">Open</button>'
          + '<button type="button" class="btn-ghost" onclick="ppePrintRecord(\''+r.id+'\')">Print</button>'
          + '<button type="button" class="btn-ghost" onclick="ppeOpenIssueModal(safetyData.ppeIssuance.find(x=>x.id===\''+r.id+'\'))">Edit</button>'
        + '</div>'
      + '</div></div>';
  }).join('');
  return head + rows;
}
function ppeRecordsFilterChange(key, val){ _ppeRecordsFilter[key] = val; ppeRenderPane(); }
function ppeOpenRecordView(id){
  var r = ppeIssuanceArr().filter(function(x){return x.id===id;})[0];
  if(!r){ showToast('Record not found','red'); return; }
  var body = '<div class="nm-form-grid">'
    + '<div class="form-row"><label>Reference</label><div style="padding:6px 0;font-weight:700">'+escHtml(r.refNo||'')+'</div></div>'
    + '<div class="form-row"><label>Date Issued</label><div style="padding:6px 0">'+escHtml(r.dateIssued||'')+'</div></div>'
    + '<div class="form-row"><label>Item</label><div style="padding:6px 0">'+escHtml(r.itemId)+' — '+escHtml(r.itemName)+'</div></div>'
    + '<div class="form-row"><label>Quantity Issued</label><div style="padding:6px 0">'+r.qtyIssued+'</div></div>'
    + '<div class="form-row"><label>Employee</label><div style="padding:6px 0">'+escHtml(r.employeeName||'')+' ('+escHtml(r.employeeId||'—')+')</div></div>'
    + '<div class="form-row"><label>Department</label><div style="padding:6px 0">'+escHtml(r.department||'')+'</div></div>'
    + '<div class="form-row"><label>Reason</label><div style="padding:6px 0">'+escHtml(r.reason||'')+'</div></div>'
    + '<div class="form-row"><label>Issued By</label><div style="padding:6px 0">'+escHtml(r.issuedBy||'')+'</div></div>'
    + '</div>';
  if(r.reason==='Temporary Loan'){
    body += '<div class="nm-form-grid">'
      + '<div class="form-row"><label>Return Date</label><div style="padding:6px 0">'+escHtml(r.returnDate||'—')+'</div></div>'
      + '<div class="form-row"><label>Returned Qty</label><div style="padding:6px 0">'+(r.returnedQty||'—')+'</div></div>'
      + '<div class="form-row"><label>Condition on Return</label><div style="padding:6px 0">'+escHtml(r.conditionOnReturn||'—')+'</div></div>'
      + '</div>';
  }
  body += '<div style="margin-top:14px;display:flex;gap:8px"><button type="button" class="btn-primary" onclick="ppePrintRecord(\''+r.id+'\')">Print</button><button type="button" class="btn-ghost" onclick="document.getElementById(\'ppe-detail-modal\').classList.remove(\'open\');ppeOpenIssueModal(safetyData.ppeIssuance.find(x=>x.id===\''+r.id+'\'))">Edit</button></div>';
  ppeOpenDetailModal('Issuance — '+(r.refNo||r.id), body);
}
function ppePrintRecord(id){
  var r = ppeIssuanceArr().filter(function(x){return x.id===id;})[0];
  if(!r){ showToast('Record not found','red'); return; }
  var css = `
    @page{ size:A4 portrait; margin:14mm; }
    body{ font-family:Arial,Helvetica,sans-serif; color:#000; background:#fff; font-size:12px; }
    table{ width:100%; border-collapse:collapse; margin-top:10px; }
    td,th{ border:1px solid #000; padding:7px 10px; }
    .ppe-print-title{ font-size:18px; font-weight:900; margin-bottom:2px; }
    .ppe-print-sub{ color:#444; margin-bottom:10px; }
  `;
  var body = '<div class="ppe-print-title">PPE Issuance Slip</div><div class="ppe-print-sub">Reference: '+printEsc(r.refNo)+'</div>'
    + '<table>'
    + '<tr><td><b>Date Issued</b></td><td>'+printEsc(r.dateIssued)+'</td><td><b>Issued By</b></td><td>'+printEsc(r.issuedBy)+'</td></tr>'
    + '<tr><td><b>Item</b></td><td colspan="3">'+printEsc(r.itemId)+' — '+printEsc(r.itemName)+'</td></tr>'
    + '<tr><td><b>Quantity</b></td><td>'+printEsc(String(r.qtyIssued))+'</td><td><b>Category</b></td><td>'+printEsc(r.category)+'</td></tr>'
    + '<tr><td><b>Employee</b></td><td>'+printEsc(r.employeeName)+'</td><td><b>Employee ID</b></td><td>'+printEsc(r.employeeId)+'</td></tr>'
    + '<tr><td><b>Department</b></td><td>'+printEsc(r.department)+'</td><td><b>Reason</b></td><td>'+printEsc(r.reason)+'</td></tr>'
    + (r.reason==='Temporary Loan' ? '<tr><td><b>Return Date</b></td><td>'+printEsc(r.returnDate)+'</td><td><b>Condition on Return</b></td><td>'+printEsc(r.conditionOnReturn)+'</td></tr>' : '')
    + '</table>'
    + '<div style="margin-top:30px">Employee Signature: _________________________</div>';
  openPrintPreview('PPE Issuance — '+(r.refNo||''), body, css);
}

/* ================================= EMPLOYEE PPE HISTORY ================================= */
function ppeOpenEmployeeHistorySearch(){
  var body = '<div class="form-row"><label>Search Employee</label><input type="text" id="ppe-emp-hist-q" placeholder="Name or ID…" oninput="ppeEmployeeHistorySearch(this.value)"/></div>'
    + '<div id="ppe-emp-hist-results" class="trn-pick-list"></div>'
    + '<div id="ppe-emp-hist-detail"></div>';
  ppeOpenDetailModal('Employee PPE History', body);
}
function ppeEmployeeHistorySearch(q){
  var box = document.getElementById('ppe-emp-hist-results');
  var detail = document.getElementById('ppe-emp-hist-detail');
  if(detail) detail.innerHTML = '';
  if(!q || q.length<2){ box.innerHTML=''; return; }
  var ql = q.toLowerCase();
  var fromIssuance = {};
  ppeIssuanceArr().forEach(function(r){ if(r.employeeId) fromIssuance[r.employeeId] = r.employeeName; });
  var candidates = [];
  if(typeof TRAINING_DATA!=='undefined'){
    TRAINING_DATA.employees.forEach(function(e){
      if((e.name||'').toLowerCase().indexOf(ql)>=0 || (e.id||'').toLowerCase().indexOf(ql)>=0) candidates.push({id:e.id, name:e.name});
    });
  }
  Object.keys(fromIssuance).forEach(function(id){
    if(candidates.some(function(c){return c.id===id;})) return;
    if(id.toLowerCase().indexOf(ql)>=0 || (fromIssuance[id]||'').toLowerCase().indexOf(ql)>=0) candidates.push({id:id, name:fromIssuance[id]});
  });
  candidates = candidates.slice(0,15);
  box.innerHTML = candidates.map(function(c){
    return '<div class="trn-pick-row" style="cursor:pointer" onclick="ppeShowEmployeeHistory(\''+c.id.replace(/'/g,"\\'")+'\')"><b>'+escHtml(c.name)+'</b><span class="trn-sub">'+escHtml(c.id)+'</span></div>';
  }).join('') || '<div class="empty-state-hint">No matches</div>';
}
function ppeShowEmployeeHistory(empId){
  var recs = ppeIssuanceArr().filter(function(r){ return r.employeeId===empId; }).sort(function(a,b){return new Date(b.dateIssued)-new Date(a.dateIssued);});
  var name = recs.length ? recs[0].employeeName : ((typeof TRAINING_DATA!=='undefined' && (TRAINING_DATA.employees.filter(function(e){return e.id===empId;})[0]||{}).name) || empId);
  var total = recs.reduce(function(s,r){return s+(parseFloat(r.qtyIssued)||0);},0);
  var newIssues = recs.filter(function(r){return r.reason==='New Issue';}).length;
  var lost = recs.filter(function(r){return r.reason==='Replacement (Lost)';}).length;
  var damaged = recs.filter(function(r){return r.reason==='Replacement (Damaged)';}).length;
  var worn = recs.filter(function(r){return r.reason==='Replacement (Worn)';}).length;
  var loans = recs.filter(function(r){return r.reason==='Temporary Loan';}).length;
  var lastDate = recs.length ? recs[0].dateIssued : null;
  var flag = ppeEmployeeRiskFlag(lost, damaged, total);

  var rows = recs.map(function(r){
    return '<tr><td style="text-align:left">'+escHtml(r.dateIssued)+'</td><td style="text-align:left">'+escHtml(r.itemName)+'</td><td>'+r.qtyIssued+'</td><td>'+escHtml(r.reason)+'</td></tr>';
  }).join('');

  var detail = document.getElementById('ppe-emp-hist-detail');
  if(!detail) return;
  detail.innerHTML = '<div class="pbi-card-title" style="margin-top:14px">'+escHtml(name)+' ('+escHtml(empId)+')</div>'
    + '<div class="nm-form-grid">'
      + '<div class="form-row"><label>Total PPE Issued</label><div style="padding:6px 0;font-weight:800">'+total+'</div></div>'
      + '<div class="form-row"><label>New Issues</label><div style="padding:6px 0">'+newIssues+'</div></div>'
      + '<div class="form-row"><label>Lost Replacements</label><div style="padding:6px 0">'+lost+'</div></div>'
      + '<div class="form-row"><label>Damaged Replacements</label><div style="padding:6px 0">'+damaged+'</div></div>'
      + '<div class="form-row"><label>Worn Replacements</label><div style="padding:6px 0">'+worn+'</div></div>'
      + '<div class="form-row"><label>Temporary Loans</label><div style="padding:6px 0">'+loans+'</div></div>'
      + '<div class="form-row"><label>Last Issue Date</label><div style="padding:6px 0">'+escHtml(lastDate||'—')+'</div></div>'
      + '<div class="form-row"><label>Usage Pattern</label><div style="padding:6px 0;font-weight:700;color:'+flag.color+'">'+flag.label+'</div></div>'
    + '</div>'
    + '<div style="overflow:auto;margin-top:10px"><table class="pbi-table"><thead><tr><th style="text-align:left;background:#1e3a5f">Date</th><th style="text-align:left;background:#1e3a5f">Item</th><th style="background:#1e3a5f">Qty</th><th style="background:#1e3a5f">Reason</th></tr></thead><tbody>'+(rows||'<tr><td colspan="4">No issuance history</td></tr>')+'</tbody></table></div>';
}
// Neutral, non-accusatory language throughout — the purpose is to flag patterns for review,
// never to assert misuse. Thresholds mirror the source workbook's own employee-risk formula
// (Lost>=3 / Damaged>=3 / Total>=20).
function ppeEmployeeRiskFlag(lost, damaged, total){
  if(lost>=3) return { label:'High Replacement Frequency (Lost) — Review Recommended', color:'#dc2626' };
  if(damaged>=3) return { label:'High Replacement Frequency (Damaged) — Review Recommended', color:'#d97706' };
  if(total>=20) return { label:'High Volume — Monitor', color:'#d97706' };
  return { label:'Normal Usage', color:'#16a34a' };
}

/* ================================= STOCK ALERTS ================================= */
function ppeBuildAlerts(){
  var f = _ppeAlertsFilter;
  var items = ppeAllItems().filter(function(it){ return f.category==='all' || it.category===f.category; });
  var alerts = items.map(function(it){ return { item:it, status:ppeStatusFor(it) }; })
    .filter(function(a){ return a.status.code!=='ok'; })
    .sort(function(a,b){
      var order = {out:0, reorder:1, low:2};
      return (order[a.status.code]-order[b.status.code]) || (a.status.stock - b.status.stock);
    });
  var outCount = alerts.filter(function(a){return a.status.code==='out';}).length;
  var reorderCount = alerts.filter(function(a){return a.status.code==='reorder';}).length;
  var lowCount = alerts.filter(function(a){return a.status.code==='low';}).length;

  var catOpts = ['<option value="all">All Categories</option>'].concat(PPE_CATEGORIES.map(function(c){
    return '<option value="'+escHtml(c)+'"'+(f.category===c?' selected':'')+'>'+escHtml(c)+'</option>';
  })).join('');

  var head = '<div class="page-title" style="margin-bottom:2px">Stock Alert Dashboard</div>'
    + '<div class="page-sub">Items needing reorder — updates automatically, no manual maintenance</div>'
    + '<div class="pbi-kpi-row" style="margin-top:12px">'
      + '<div class="pbi-kpi"><div class="pbi-kpi-val" style="color:'+PPE_STATUS_COLOR.out+'">'+outCount+'</div><div class="pbi-kpi-lbl">Out of Stock</div></div>'
      + '<div class="pbi-kpi"><div class="pbi-kpi-val" style="color:'+PPE_STATUS_COLOR.reorder+'">'+reorderCount+'</div><div class="pbi-kpi-lbl">Reorder Now</div></div>'
      + '<div class="pbi-kpi"><div class="pbi-kpi-val" style="color:'+PPE_STATUS_COLOR.low+'">'+lowCount+'</div><div class="pbi-kpi-lbl">Low Stock</div></div>'
    + '</div>'
    + '<div class="trn-filters" style="margin-top:14px"><select onchange="ppeAlertsFilterChange(\'category\',this.value)">'+catOpts+'</select></div>';

  if(!alerts.length){
    return head + '<div class="empty-state"><div class="empty-state-icon">✅</div><div class="empty-state-title">All items are healthy</div><div class="empty-state-hint">No stock alerts for this filter.</div></div>';
  }
  var rows = alerts.map(function(a){
    var shortage = Math.max(0, (parseFloat(a.item.reorderPoint)||0) - a.status.stock);
    return '<tr><td style="text-align:left;font-weight:700">'+escHtml(a.item.id)+'</td><td style="text-align:left">'+escHtml(a.item.name)+'</td><td>'+escHtml(a.item.category)+'</td>'
      + '<td>'+a.status.stock+'</td><td>'+a.item.reorderPoint+'</td><td>'+shortage+'</td>'
      + '<td><span style="color:'+a.status.color+';font-weight:800">'+a.status.label+'</span></td>'
      + '<td style="text-align:left">'+escHtml(ppeActionFor(a.status))+'</td>'
      + '<td><button type="button" class="btn-ghost" onclick="ppeOpenReceive(\''+a.item.id+'\')">Receive Stock</button></td></tr>';
  }).join('');
  return head + '<div style="overflow:auto"><table class="pbi-table"><thead><tr>'
    + '<th style="text-align:left;background:#1e3a5f">Item ID</th><th style="text-align:left;background:#1e3a5f">Item Name</th><th style="background:#1e3a5f">Category</th>'
    + '<th style="background:#1e3a5f">Current Stock</th><th style="background:#1e3a5f">Reorder Point</th><th style="background:#1e3a5f">Shortage</th>'
    + '<th style="background:#1e3a5f">Status</th><th style="text-align:left;background:#1e3a5f">Recommended Action</th><th style="background:#1e3a5f"></th>'
    + '</tr></thead><tbody>'+rows+'</tbody></table></div>';
}
function ppeAlertsFilterChange(key, val){ _ppeAlertsFilter[key] = val; ppeRenderPane(); }

/* ================================= ANALYTICS ================================= */
// Every block here is recalculated live from safetyData.ppeIssuance / ppeAllItems() — none of
// the source workbook's formulas are copied verbatim (several were incomplete or stale; see
// the module's header comment and the final report's "Analytics calculations" section).
function ppeIsReplacement(reason){ return String(reason||'').indexOf('Replacement')===0; }

function ppeBuildAnalytics(){
  if(typeof PPE_DATA==='undefined') return '<div class="empty-state"><div class="empty-state-title">PPE data not loaded</div></div>';
  var recs = ppeIssuanceArr();
  var grandTotal = recs.reduce(function(s,r){return s+(parseFloat(r.qtyIssued)||0);},0);

  var html = '<div class="page-title" style="margin-bottom:2px">PPE Analytics Dashboard</div>'
    + '<div class="page-sub">Safety intelligence — loss/damage, employee &amp; department consumption, stock health, replacement rate, monthly trend</div>';

  if(!recs.length){
    html += '<div class="empty-state" style="margin-top:14px"><div class="empty-state-icon">📊</div><div class="empty-state-title">No issuance activity yet</div><div class="empty-state-hint">Analytics will populate automatically as PPE is issued through this module.</div></div>';
  }

  html += ppeAnalyticsLossDamage(recs, grandTotal);
  html += ppeAnalyticsEmployee(recs);
  html += ppeAnalyticsDepartment(recs);
  html += ppeAnalyticsStockHealth();
  html += ppeAnalyticsReplacementRate(recs);
  html += ppeAnalyticsMonthlyTrend();
  html += ppeAnalyticsTopConsumed(recs);
  return html;
}

function ppeAnalyticsLossDamage(recs, grandTotal){
  var totalLost = recs.filter(function(r){return r.reason==='Replacement (Lost)';}).reduce(function(s,r){return s+(parseFloat(r.qtyIssued)||0);},0);
  var totalDamaged = recs.filter(function(r){return r.reason==='Replacement (Damaged)';}).reduce(function(s,r){return s+(parseFloat(r.qtyIssued)||0);},0);
  var totalWorn = recs.filter(function(r){return r.reason==='Replacement (Worn)';}).reduce(function(s,r){return s+(parseFloat(r.qtyIssued)||0);},0);
  var lostPct = grandTotal ? Math.round(totalLost/grandTotal*1000)/10 : 0;

  var kpis = '<div class="pbi-kpi-row" style="grid-template-columns:repeat(5,minmax(0,1fr))">'
    + '<div class="pbi-kpi"><div class="pbi-kpi-val" style="color:#dc2626">'+totalLost+'</div><div class="pbi-kpi-lbl">Total Lost</div></div>'
    + '<div class="pbi-kpi"><div class="pbi-kpi-val" style="color:#d97706">'+totalDamaged+'</div><div class="pbi-kpi-lbl">Total Damaged</div></div>'
    + '<div class="pbi-kpi"><div class="pbi-kpi-val" style="color:#ca8a04">'+totalWorn+'</div><div class="pbi-kpi-lbl">Total Worn Out</div></div>'
    + '<div class="pbi-kpi"><div class="pbi-kpi-val">'+grandTotal+'</div><div class="pbi-kpi-lbl">Grand Total Issued</div></div>'
    + '<div class="pbi-kpi"><div class="pbi-kpi-val">'+lostPct+'%</div><div class="pbi-kpi-lbl">Lost % of Total</div></div>'
    + '</div>';

  var byItem = {};
  recs.forEach(function(r){
    if(!ppeIsReplacement(r.reason)) return;
    var e = byItem[r.itemId] || (byItem[r.itemId] = { id:r.itemId, name:r.itemName, lost:0, damaged:0, worn:0 });
    var qty = parseFloat(r.qtyIssued)||0;
    if(r.reason==='Replacement (Lost)') e.lost += qty;
    else if(r.reason==='Replacement (Damaged)') e.damaged += qty;
    else if(r.reason==='Replacement (Worn)') e.worn += qty;
  });
  var itemRows = Object.keys(byItem).map(function(k){ return byItem[k]; })
    .map(function(e){ e.total = e.lost+e.damaged+e.worn; e.pct = grandTotal ? Math.round(e.total/grandTotal*1000)/10 : 0; return e; })
    .sort(function(a,b){ return b.total-a.total; });
  var rows = itemRows.map(function(e){
    var flag = e.lost>=5 ? {l:'🚨 High Loss — Check Lockers / Access', c:'#dc2626'}
      : e.damaged>=5 ? {l:'⚠️ High Damage — Supplier/Item Performance Review', c:'#d97706'}
      : e.worn>=10 ? {l:'🔄 High Wear — Check Lifespan', c:'#ca8a04'}
      : {l:'✅ Normal', c:'#16a34a'};
    return '<tr><td style="text-align:left;font-weight:700">'+escHtml(e.id)+'</td><td style="text-align:left">'+escHtml(e.name)+'</td>'
      + '<td>'+e.lost+'</td><td>'+e.damaged+'</td><td>'+e.worn+'</td><td>'+e.total+'</td><td>'+e.pct+'%</td>'
      + '<td><span style="color:'+flag.c+';font-weight:700">'+flag.l+'</span></td></tr>';
  }).join('');

  return '<div class="pbi-card" style="margin-top:14px"><div class="pbi-card-title">1 · PPE Loss &amp; Damage Analysis</div>'
    + kpis
    + (rows ? '<div style="overflow:auto;margin-top:10px"><table class="pbi-table"><thead><tr><th style="text-align:left;background:#1e3a5f">Item ID</th><th style="text-align:left;background:#1e3a5f">Item Name</th><th style="background:#1e3a5f">Lost</th><th style="background:#1e3a5f">Damaged</th><th style="background:#1e3a5f">Worn</th><th style="background:#1e3a5f">Total Replaced</th><th style="background:#1e3a5f">% of All Issues</th><th style="background:#1e3a5f">Risk Flag</th></tr></thead><tbody>'+rows+'</tbody></table></div>' : '<div class="empty-state empty-state-sm" style="margin-top:10px">No replacement activity yet</div>')
    + '</div>';
}

function ppeAnalyticsEmployee(recs){
  var byEmp = {};
  recs.forEach(function(r){
    if(!r.employeeId) return;
    var e = byEmp[r.employeeId] || (byEmp[r.employeeId] = { id:r.employeeId, name:r.employeeName, total:0, newIssues:0, lost:0, damaged:0, worn:0, lastDate:null });
    var qty = parseFloat(r.qtyIssued)||0;
    e.total += qty;
    if(r.reason==='New Issue') e.newIssues += qty;
    if(r.reason==='Replacement (Lost)') e.lost += qty;
    if(r.reason==='Replacement (Damaged)') e.damaged += qty;
    if(r.reason==='Replacement (Worn)') e.worn += qty;
    if(!e.lastDate || r.dateIssued > e.lastDate) e.lastDate = r.dateIssued;
  });
  var list = Object.keys(byEmp).map(function(k){ return byEmp[k]; }).sort(function(a,b){ return b.total-a.total; }).slice(0,25);
  var rows = list.map(function(e){
    var replacements = e.total - e.newIssues;
    var flag = ppeEmployeeRiskFlag(e.lost, e.damaged, e.total);
    return '<tr><td style="text-align:left;font-weight:700"><a href="#" onclick="ppeOpenEmployeeHistorySearch();document.getElementById(\'ppe-emp-hist-q\').value=\''+escHtml(e.name).replace(/'/g,"")+'\';ppeEmployeeHistorySearch(\''+escHtml(e.name).replace(/'/g,"")+'\');return false;">'+escHtml(e.name)+'</a></td><td>'+escHtml(e.id)+'</td>'
      + '<td>'+e.total+'</td><td>'+e.newIssues+'</td><td>'+replacements+'</td><td>'+e.lost+'</td><td>'+e.damaged+'</td><td>'+escHtml(e.lastDate||'—')+'</td>'
      + '<td><span style="color:'+flag.color+';font-weight:700">'+flag.label+'</span></td></tr>';
  }).join('');
  return '<div class="pbi-card" style="margin-top:14px"><div class="pbi-card-title">2 · Employee PPE Consumption (Top 25 by volume — search any employee via "Employee PPE History" on Issuance History)</div>'
    + (rows ? '<div style="overflow:auto"><table class="pbi-table"><thead><tr><th style="text-align:left;background:#1e3a5f">Employee</th><th style="background:#1e3a5f">ID</th><th style="background:#1e3a5f">Total Qty</th><th style="background:#1e3a5f">New Issues</th><th style="background:#1e3a5f">Replacements</th><th style="background:#1e3a5f">Lost</th><th style="background:#1e3a5f">Damaged</th><th style="background:#1e3a5f">Last Issue</th><th style="background:#1e3a5f">Usage Pattern</th></tr></thead><tbody>'+rows+'</tbody></table></div>' : '<div class="empty-state empty-state-sm">No issuance activity yet</div>')
    + '</div>';
}

function ppeAnalyticsDepartment(recs){
  var byDept = {};
  ppeDepartments().forEach(function(d){ byDept[d] = { dept:d, total:0, newIssues:0, lost:0, damaged:0, items:{} }; });
  recs.forEach(function(r){
    var d = byDept[r.department] || (byDept[r.department] = { dept:r.department, total:0, newIssues:0, lost:0, damaged:0, items:{} });
    var qty = parseFloat(r.qtyIssued)||0;
    d.total += qty;
    if(r.reason==='New Issue') d.newIssues += qty;
    if(r.reason==='Replacement (Lost)') d.lost += qty;
    if(r.reason==='Replacement (Damaged)') d.damaged += qty;
    if(r.itemName) d.items[r.itemName] = (d.items[r.itemName]||0) + qty;
  });
  var grand = Object.keys(byDept).reduce(function(s,k){return s+byDept[k].total;},0);
  var list = Object.keys(byDept).map(function(k){ return byDept[k]; });
  var rows = list.map(function(d){
    var pct = grand ? Math.round(d.total/grand*1000)/10 : 0;
    var top = 'No data yet', topQty = 0;
    Object.keys(d.items).forEach(function(name){ if(d.items[name]>topQty){ topQty=d.items[name]; top=name; } });
    return '<tr><td style="text-align:left;font-weight:700">'+escHtml(d.dept)+'</td><td>'+d.total+'</td><td>'+d.newIssues+'</td><td>'+(d.total-d.newIssues)+'</td><td>'+d.lost+'</td><td>'+d.damaged+'</td><td>'+pct+'%</td><td style="text-align:left">'+escHtml(top)+'</td></tr>';
  }).join('');
  var bars = list.filter(function(d){return d.total>0;}).sort(function(a,b){return b.total-a.total;}).map(function(d){ return [d.dept, d.total]; });

  return '<div class="pbi-card" style="margin-top:14px"><div class="pbi-card-title">3 · Department Issuance Overview</div>'
    + (bars.length && typeof buildBarChart==='function' ? buildBarChart(bars) : '<div class="empty-state empty-state-sm">No issuance activity yet</div>')
    + '<div style="overflow:auto;margin-top:10px"><table class="pbi-table"><thead><tr><th style="text-align:left;background:#1e3a5f">Department</th><th style="background:#1e3a5f">Total Qty</th><th style="background:#1e3a5f">New Issues</th><th style="background:#1e3a5f">Replacements</th><th style="background:#1e3a5f">Lost</th><th style="background:#1e3a5f">Damaged</th><th style="background:#1e3a5f">% of Total</th><th style="text-align:left;background:#1e3a5f">Top PPE Item</th></tr></thead><tbody>'+rows+'</tbody></table></div>'
    + '</div>';
}

function ppeAnalyticsStockHealth(){
  var items = ppeAllItems();
  var cats = PPE_CATEGORIES.concat(['ALL ITEMS']);
  var rows = cats.map(function(cat){
    var list = cat==='ALL ITEMS' ? items : items.filter(function(it){return it.category===cat;});
    var ok=0, low=0, reorder=0, out=0;
    list.forEach(function(it){
      var s = ppeStatusFor(it).code;
      if(s==='ok') ok++; else if(s==='low') low++; else if(s==='reorder') reorder++; else if(s==='out') out++;
    });
    var healthPct = list.length ? Math.round(ok/list.length*100) : 100;
    var action = out>0 ? '🚨 Place orders for out-of-stock items' : reorder>0 ? '📋 Create PO for reorder items' : low>0 ? '👀 Monitor low stock items' : '✅ All good';
    return { cat:cat, total:list.length, ok:ok, low:low, reorder:reorder, out:out, healthPct:healthPct, action:action };
  });
  var rowsHtml = rows.map(function(r){
    return '<tr><td style="text-align:left;font-weight:700">'+escHtml(r.cat)+'</td><td>'+r.total+'</td><td>'+r.ok+'</td><td>'+r.low+'</td><td>'+r.reorder+'</td><td>'+r.out+'</td>'
      + '<td><span style="color:'+(r.healthPct>=80?'#16a34a':r.healthPct>=50?'#d97706':'#dc2626')+';font-weight:800">'+r.healthPct+'%</span></td>'
      + '<td style="text-align:left">'+escHtml(r.action)+'</td></tr>';
  }).join('');
  var bars = rows.filter(function(r){return r.cat!=='ALL ITEMS';}).map(function(r){ return [r.cat, r.healthPct]; });
  var colors = rows.filter(function(r){return r.cat!=='ALL ITEMS';}).map(function(r){ return r.healthPct>=80?'#16a34a':r.healthPct>=50?'#d97706':'#dc2626'; });

  return '<div class="pbi-card" style="margin-top:14px"><div class="pbi-card-title">4 · Stock Health Monitor</div>'
    + (typeof buildBarChart==='function' ? buildBarChart(bars, colors) : '')
    + '<div style="overflow:auto;margin-top:10px"><table class="pbi-table"><thead><tr><th style="text-align:left;background:#1e3a5f">Category</th><th style="background:#1e3a5f">Total SKUs</th><th style="background:#1e3a5f">OK</th><th style="background:#1e3a5f">Low</th><th style="background:#1e3a5f">Reorder</th><th style="background:#1e3a5f">Out of Stock</th><th style="background:#1e3a5f">Health %</th><th style="text-align:left;background:#1e3a5f">Action</th></tr></thead><tbody>'+rowsHtml+'</tbody></table></div>'
    + '</div>';
}

function ppeAnalyticsReplacementRate(recs){
  var byItem = {};
  recs.forEach(function(r){
    var e = byItem[r.itemId] || (byItem[r.itemId] = { id:r.itemId, name:r.itemName, total:0, newIssues:0, replacements:0, txCount:0 });
    var qty = parseFloat(r.qtyIssued)||0;
    e.total += qty; e.txCount++;
    if(r.reason==='New Issue') e.newIssues += qty;
    else if(ppeIsReplacement(r.reason)) e.replacements += qty;
  });
  var list = Object.keys(byItem).map(function(k){ return byItem[k]; }).map(function(e){
    e.rate = (e.newIssues+e.replacements) ? Math.round(e.replacements/(e.newIssues+e.replacements)*1000)/10 : 0;
    e.avgQty = e.txCount ? Math.round(e.total/e.txCount*10)/10 : 0;
    return e;
  }).sort(function(a,b){ return b.rate-a.rate; });
  var rows = list.map(function(e){
    var flag = e.total===0 ? {l:'⬜ No Data Yet', c:'#94a3b8'}
      : e.rate>60 ? {l:'🚨 High Replacement Rate — Review Supplier/Item Performance', c:'#dc2626'}
      : e.rate>30 ? {l:'⚠️ Moderate — Monitor Quality', c:'#d97706'}
      : {l:'✅ Normal Lifecycle', c:'#16a34a'};
    return '<tr><td style="text-align:left;font-weight:700">'+escHtml(e.id)+'</td><td style="text-align:left">'+escHtml(e.name)+'</td><td>'+e.total+'</td><td>'+e.newIssues+'</td><td>'+e.replacements+'</td><td>'+e.rate+'%</td><td>'+e.avgQty+'</td><td><span style="color:'+flag.c+';font-weight:700">'+flag.l+'</span></td></tr>';
  }).join('');
  return '<div class="pbi-card" style="margin-top:14px"><div class="pbi-card-title">5 · PPE Replacement Rate (highest first)</div>'
    + (rows ? '<div style="overflow:auto"><table class="pbi-table"><thead><tr><th style="text-align:left;background:#1e3a5f">Item ID</th><th style="text-align:left;background:#1e3a5f">Item Name</th><th style="background:#1e3a5f">Total Issued</th><th style="background:#1e3a5f">New Issues</th><th style="background:#1e3a5f">Replacements</th><th style="background:#1e3a5f">Replacement Rate</th><th style="background:#1e3a5f">Avg Qty/Tx</th><th style="background:#1e3a5f">Lifecycle Flag</th></tr></thead><tbody>'+rows+'</tbody></table></div>' : '<div class="empty-state empty-state-sm">No issuance activity yet</div>')
    + '</div>';
}

function ppeAnalyticsMonthlyTrend(){
  var months = ppeLastNMonthsIssuance(_ppeAnalyticsMonths);
  var trend = months.map(function(m){ return [m.key, m.total]; });
  var rows = months.map(function(m){
    return '<tr><td style="text-align:left">'+escHtml(m.key)+'</td><td>'+m.total+'</td><td>'+m.newIssue+'</td><td>'+m.replacement+'</td><td>'+m.lost+'</td><td>'+m.damaged+'</td><td>'+m.activeDepts+'</td></tr>';
  }).join('');
  var toggle = [6,12].map(function(n){
    return '<button type="button" class="nav-btn'+(_ppeAnalyticsMonths===n?' active':'')+'" style="background:#fef2f2;color:#dc2626;font-weight:700" onclick="ppeSetAnalyticsMonths('+n+')">Last '+n+' Months</button>';
  }).join('');
  return '<div class="pbi-card" style="margin-top:14px"><div class="pbi-card-title">6 · Monthly Issuance Timeline</div>'
    + '<div style="display:flex;gap:8px;margin-bottom:10px">'+toggle+'</div>'
    + (typeof buildTrendChart==='function' ? buildTrendChart(trend) : '')
    + '<div style="overflow:auto;margin-top:10px"><table class="pbi-table"><thead><tr><th style="text-align:left;background:#1e3a5f">Month</th><th style="background:#1e3a5f">Total Qty</th><th style="background:#1e3a5f">New Issues</th><th style="background:#1e3a5f">Replacements</th><th style="background:#1e3a5f">Lost</th><th style="background:#1e3a5f">Damaged</th><th style="background:#1e3a5f">Active Depts</th></tr></thead><tbody>'+rows+'</tbody></table></div>'
    + '</div>';
}
function ppeSetAnalyticsMonths(n){ _ppeAnalyticsMonths = n; ppeRenderPane(); }

function ppeAnalyticsTopConsumed(recs){
  function topBy(filterFn, n){
    var byItem = {};
    recs.filter(filterFn).forEach(function(r){
      byItem[r.itemId] = (byItem[r.itemId]||{id:r.itemId,name:r.itemName,qty:0});
      byItem[r.itemId].qty += parseFloat(r.qtyIssued)||0;
    });
    return Object.keys(byItem).map(function(k){return byItem[k];}).sort(function(a,b){return b.qty-a.qty;}).slice(0,n||5);
  }
  function topDepts(n){
    var byDept = {};
    recs.forEach(function(r){ if(!r.department) return; byDept[r.department]=(byDept[r.department]||0)+(parseFloat(r.qtyIssued)||0); });
    return Object.keys(byDept).map(function(d){return {dept:d, qty:byDept[d]};}).sort(function(a,b){return b.qty-a.qty;}).slice(0,n||5);
  }
  var topIssued = topBy(function(){return true;});
  var topReplaced = topBy(function(r){return ppeIsReplacement(r.reason);});
  var topLost = topBy(function(r){return r.reason==='Replacement (Lost)';});
  var topDamaged = topBy(function(r){return r.reason==='Replacement (Damaged)';});
  var depts = topDepts();

  function listCard(title, list, unitLabel){
    var rows = list.map(function(x){ return '<div class="pbih-row"><div><b>'+escHtml(x.name||x.dept)+'</b></div><div class="pbih-row-r"><span>'+x.qty+' '+unitLabel+'</span></div></div>'; }).join('');
    return '<div class="pbi-card"><div class="pbi-card-title">'+title+'</div>'+(rows||'<div class="empty-state empty-state-sm">No data yet</div>')+'</div>';
  }
  return '<div class="pbi-grid-2" style="margin-top:14px">'
    + listCard('Top PPE Items Issued', topIssued, 'issued')
    + listCard('Top Replacement Items', topReplaced, 'replaced')
    + '</div>'
    + '<div class="pbi-grid-2">'
    + listCard('Top Lost Items', topLost, 'lost')
    + listCard('Top Damaged Items', topDamaged, 'damaged')
    + '</div>'
    + listCard('Top Consuming Departments', depts, 'issued');
}

/* ================================= EXPORTS ================================= */
function ppeExportInventory(){
  withBusy('Preparing PPE Inventory Excel…', function(){ ppeExportInventoryWork(); });
}
function ppeExportInventoryWork(){
  if(typeof XLSX==='undefined'){ showToast('Excel export unavailable — required library did not load.','red'); return; }
  try{
    var wb = XLSX.utils.book_new();
    var headers = ['Item ID','Item Name','Category','Unit','Opening Balance','Received','Total Issued','Current Stock','Reorder Point','Max Stock','Status','Notes'];
    var rows = ppeAllItems().sort(function(a,b){return a.id.localeCompare(b.id, undefined, {numeric:true});}).map(function(it){
      var st = ppeStatusFor(it);
      var sc = { ok:{bg:'D1FAE5',fg:'16A34A'}, low:{bg:'FEF3C7',fg:'D97706'}, reorder:{bg:'FEE2E2',fg:'DC2626'}, out:{bg:'FCA5A5',fg:'7F1D1D'} }[st.code];
      return [it.id, it.name, it.category, it.unit, it.opening, (parseFloat(it.received)||0)+ppeReceivedExtra(it.id), ppeGrossIssued(it.id), st.stock, it.reorderPoint, it.maxStock, cellStatus(st.label, sc.bg, sc.fg), it.notes||''];
    });
    addStyledSheet(wb, 'PPE Inventory', headers, rows, 'B91C1C');
    var now = new Date();
    var filename = 'PPE_Inventory_'+now.toISOString().split('T')[0]+'.xlsx';
    XLSX.writeFile(wb, filename, { bookType:'xlsx', type:'binary', cellStyles:true });
    showToast('PPE Inventory exported: '+filename, 'green');
  }catch(err){ console.error('PPE inventory export error', err); showToast('Export error: '+err.message, 'red'); }
}
function ppeExportIssuance(){
  withBusy('Preparing PPE Issuance Excel…', function(){ ppeExportIssuanceWork(); });
}
function ppeExportIssuanceWork(){
  if(typeof XLSX==='undefined'){ showToast('Excel export unavailable — required library did not load.','red'); return; }
  var recs = ppeFilteredRecords();
  if(!recs.length){ showToast('No issuance records to export for this filter','red'); return; }
  try{
    var wb = XLSX.utils.book_new();
    var headers = ['Issue Ref #','Date Issued','Item ID','Item Name','Employee ID','Employee Name','Qty Issued','Department','Reason','Return Date','Returned Qty','Condition on Return','Issued By'];
    var rows = recs.map(function(r){
      return [r.refNo, r.dateIssued, r.itemId, r.itemName, r.employeeId, r.employeeName, r.qtyIssued, r.department, r.reason, r.returnDate||'', r.returnedQty||'', r.conditionOnReturn||'', r.issuedBy];
    });
    addStyledSheet(wb, 'PPE Issuance', headers, rows, 'B91C1C');
    var now = new Date();
    var filename = 'PPE_Issuance_'+now.toISOString().split('T')[0]+'.xlsx';
    XLSX.writeFile(wb, filename, { bookType:'xlsx', type:'binary', cellStyles:true });
    showToast('PPE Issuance exported: '+filename, 'green');
  }catch(err){ console.error('PPE issuance export error', err); showToast('Export error: '+err.message, 'red'); }
}

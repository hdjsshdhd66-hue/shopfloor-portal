/* ==========================================================================
   training.js — Training & TBT Management (Safety Portal)
   ==========================================================================
   Digitizes the company's real EHS Training Matrix, Training Attendance
   Form (F/HSE/102) and Toolbox Talk Form (F/HSE/101) into the existing
   Shop Floor Digital Portal — same architecture as the rest of the app
   (plain global functions/vars, no build system, no framework).

   Reference data:  training-data.js -> global TRAINING_DATA
   Persisted data:  safetyData.trainingRecords[]      (Attendance + TBT records)
                     safetyData.trainingOverrides{}    (matrix completion-date
                     overlay written only when a saved record is explicitly
                     linked to a Training Matrix course — see trnLinkRecordToMatrix)
   Both persist through the app's existing saveState()/loadState() (pqs_data).

   Status engine reproduces the source workbook's array formula exactly:
     - excluded  : employee's Location text contains resign/relocate/transfer/terminate
     - notreq    : course not required for the employee's job title
     - notdone   : required, no completion date on file
     - overdue   : completion age (days) > course frequency (days)
     - due       : not overdue, but within 180 days of the next due date
     - valid     : completed and not due soon / overdue
   ISO 45001 has no defined frequency in the source — once completed it
   stays "valid" with no computable Next Due Date (special case).
   ========================================================================== */

/* ============================== CONSTANTS ============================== */
var TRN_DUE_SOON_DAYS = 180;
var TRN_STATUS_COLOR = { valid:'#16a34a', due:'#d97706', overdue:'#dc2626', notdone:'#b91c1c', notreq:'#94a3b8', excluded:'#cbd5e1' };
var TRN_STATUS_LABEL = { valid:'Completed / Valid', due:'Due Soon', overdue:'Overdue / Expired', notdone:'Not Completed', notreq:'Not Required', excluded:'Inactive' };
var TRN_PAGE_SIZE = 30;

/* ============================== STATE =================================== */
var _trnTab = 'dashboard';                 // dashboard | matrix | forms | records | upcoming
var _trnMatrixFilter = { dept:'all', jobTitle:'all', course:'all', status:'all', manager:'all', q:'', includeInactive:false };
var _trnMatrixPage = 1;
var _trnUpcomingBucket = 'all';            // all | 30 | 60 | 90 | overdue
var _trnRecordsFilter = { type:'all', q:'' };
var _trnFormType = null;                   // 'attendance' | 'tbt'
var _trnFormAttendees = [];                // working attendee list of the open form
var _trnEditingRecordId = null;
var _trnFormDirty = false;
var _trnPickerCtx = { q:'', dept:'all' };

/* ============================ DATA ACCESSORS ============================ */
/* Training Courses follow the same Master Data pattern as PPE (see ppe.js's
   header comment): BASE (TRAINING_DATA.courses, the source workbook — never
   mutated) + CUSTOM (user-added) + OVERRIDES (edits) + ACTIVE flag
   (deactivate hides a course from new-selection UI; historical completions/
   matrix cells are unaffected since they're computed from each employee's
   own stored requirement/completion data, not from this list). */
function trnCoursesBase(){ return (typeof TRAINING_DATA!=='undefined' && TRAINING_DATA.courses) || []; }
function trnCourseCustom(){ if(!safetyData.trainingCourseCustom) safetyData.trainingCourseCustom = []; return safetyData.trainingCourseCustom; }
function trnCourseOverrides(){ if(!safetyData.trainingCourseOverrides) safetyData.trainingCourseOverrides = {}; return safetyData.trainingCourseOverrides; }
function trnIsCourseActive(key){ return !(safetyData.trainingCourseActive && safetyData.trainingCourseActive[key]===false); }
function trnCourses(includeInactive){
  var ov = trnCourseOverrides();
  var out = [];
  trnCoursesBase().concat(trnCourseCustom()).forEach(function(c){
    if(!includeInactive && !trnIsCourseActive(c.key)) return;
    var o = ov[c.key];
    var merged = o ? Object.assign({}, c, o) : Object.assign({}, c);
    merged.active = trnIsCourseActive(c.key);
    out.push(merged);
  });
  return out;
}
function trnRequirements(){ return (typeof TRAINING_DATA!=='undefined' && TRAINING_DATA.requirements) || []; }
function trnDeptCodes(){ return (typeof TRAINING_DATA!=='undefined' && TRAINING_DATA.deptCodes) || []; }
function trnManagers(){ return (typeof TRAINING_DATA!=='undefined' && TRAINING_DATA.managers) || []; }
function trnEmployees(){ return (typeof TRAINING_DATA!=='undefined' && TRAINING_DATA.employees) || []; }
function trnCourseByKey(key){ return trnCourses(true).filter(function(c){ return c.key===key; })[0] || null; }
function trnEmpById(id){ return trnEmployees().filter(function(e){ return e.id===id; })[0] || null; }

function trnAudit(entity, entityId, field, oldVal, newVal){
  if(!safetyData.trainingMasterAudit) safetyData.trainingMasterAudit = [];
  safetyData.trainingMasterAudit.unshift({ entity:entity, entityId:entityId, field:field, oldVal:oldVal, newVal:newVal, by:(currentUser&&currentUser.name)||'', at:new Date().toISOString() });
}
function trnSlugify(s){
  return String(s||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
}
function trnAddCourse(name, freqLabel, freqDays, hours){
  if(!requireAdmin('Add Training Course')) return null;
  name = String(name||'').trim();
  if(!name){ showToast('Course name is required', 'red'); return null; }
  var key = trnSlugify(name);
  if(trnCourseByKey(key)){ showToast('A course with this name already exists', 'red'); return null; }
  trnCourseCustom().push({ key:key, name:name, freqLabel:freqLabel||null, freqDays:freqDays?parseInt(freqDays,10):null, hours:hours?parseFloat(hours):null });
  trnAudit('course', key, 'created', null, name);
  saveState();
  showToast('Training Course added: '+name, 'green');
  return key;
}
function trnEditCourse(key, patch){
  if(!requireAdmin('Edit Training Course')) return;
  var current = trnCourseByKey(key);
  if(!current){ showToast('Course not found', 'red'); return; }
  var ov = trnCourseOverrides();
  ov[key] = Object.assign({}, ov[key]||{}, patch);
  trnAudit('course', key, 'edited', JSON.stringify({name:current.name,freqLabel:current.freqLabel,freqDays:current.freqDays,hours:current.hours}), JSON.stringify(patch));
  saveState();
  showToast('Training Course updated', 'green');
  trnRenderPane();
}
function trnSetCourseActive(key, active){
  if(!requireAdmin('Deactivate/Reactivate Training Course')) return;
  if(!safetyData.trainingCourseActive) safetyData.trainingCourseActive = {};
  var was = trnIsCourseActive(key);
  safetyData.trainingCourseActive[key] = active;
  trnAudit('course', key, 'active', was, active);
  saveState();
  showToast(active ? 'Course reactivated' : 'Course deactivated', 'green');
  trnRenderPane();
}

function trnOverrides(){
  if(!safetyData.trainingOverrides) safetyData.trainingOverrides = {};
  return safetyData.trainingOverrides;
}
function trnRecordsArr(){
  if(!safetyData.trainingRecords) safetyData.trainingRecords = [];
  return safetyData.trainingRecords;
}

// Effective completion date = matrix-linked record override (most recent) if present, else the
// static source-workbook date. The static reference data is never mutated.
function trnCompletionDate(emp, courseKey){
  var ov = trnOverrides();
  var empOv = ov[emp.id];
  if(empOv && empOv[courseKey] && empOv[courseKey].date) return empOv[courseKey].date;
  return (emp.training && emp.training[courseKey]) || null;
}
function trnCompletionSource(emp, courseKey){
  var ov = trnOverrides();
  var empOv = ov[emp.id];
  if(empOv && empOv[courseKey] && empOv[courseKey].date) return empOv[courseKey];
  return null;
}

function trnRequiredCourseKeys(department, jobTitle){
  var req = trnRequirements().filter(function(r){ return r.department===department && r.jobTitle===jobTitle; })[0];
  return req ? req.required : [];
}
function trnIsExcluded(emp){ return emp.active === false; }

/* ============================ STATUS ENGINE ============================= */
function trnISO(d){ return d.toISOString().slice(0,10); }
function trnParseDate(s){
  if(!s) return null;
  var d = new Date(s+'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}
function trnToday(){ var t=new Date(); t.setHours(0,0,0,0); return t; }

function trnStatusFor(emp, courseKey){
  if(trnIsExcluded(emp)) return { code:'excluded', label:TRN_STATUS_LABEL.excluded, color:TRN_STATUS_COLOR.excluded, date:null, nextDue:null };
  var required = trnRequiredCourseKeys(emp.department, emp.jobTitle);
  if(required.indexOf(courseKey) === -1) return { code:'notreq', label:TRN_STATUS_LABEL.notreq, color:TRN_STATUS_COLOR.notreq, date:null, nextDue:null };

  var course = trnCourseByKey(courseKey);
  var dateStr = trnCompletionDate(emp, courseKey);
  if(!dateStr) return { code:'notdone', label:TRN_STATUS_LABEL.notdone, color:TRN_STATUS_COLOR.notdone, date:null, nextDue:null };

  var d = trnParseDate(dateStr);
  if(!d) return { code:'notdone', label:TRN_STATUS_LABEL.notdone, color:TRN_STATUS_COLOR.notdone, date:null, nextDue:null };

  // ISO 45001 (and any course with no defined recurrence) — once done, stays valid, no due date.
  if(!course || course.freqDays == null){
    return { code:'valid', label:TRN_STATUS_LABEL.valid, color:TRN_STATUS_COLOR.valid, date:dateStr, nextDue:null, daysToDue:null };
  }

  var today = trnToday();
  var ageDays = Math.floor((today - d) / 86400000);
  var nextDue = new Date(d.getTime() + course.freqDays*86400000);
  var daysToDue = Math.floor((nextDue - today) / 86400000);

  if(ageDays > course.freqDays) return { code:'overdue', label:TRN_STATUS_LABEL.overdue, color:TRN_STATUS_COLOR.overdue, date:dateStr, nextDue:trnISO(nextDue), daysToDue:daysToDue };
  if(daysToDue <= TRN_DUE_SOON_DAYS) return { code:'due', label:TRN_STATUS_LABEL.due, color:TRN_STATUS_COLOR.due, date:dateStr, nextDue:trnISO(nextDue), daysToDue:daysToDue };
  return { code:'valid', label:TRN_STATUS_LABEL.valid, color:TRN_STATUS_COLOR.valid, date:dateStr, nextDue:trnISO(nextDue), daysToDue:daysToDue };
}

// All {emp, courseKey, status} pairs where the course is required (skips notreq to keep this
// fast/relevant — notreq is still derivable per-cell in the Matrix via trnStatusFor directly).
function trnAllRequiredStatuses(includeInactive){
  var out = [];
  trnEmployees().forEach(function(emp){
    if(!includeInactive && trnIsExcluded(emp)) return;
    var required = trnRequiredCourseKeys(emp.department, emp.jobTitle);
    required.forEach(function(ck){
      out.push({ emp:emp, courseKey:ck, status:trnStatusFor(emp, ck) });
    });
  });
  return out;
}

/* ============================== AGGREGATIONS ============================= */
function trnDeptStats(includeInactive){
  var stats = {};
  trnDeptCodes().forEach(function(d){ stats[d] = { valid:0, due:0, overdue:0, notdone:0, total:0 }; });
  trnAllRequiredStatuses(includeInactive).forEach(function(row){
    var d = row.emp.department;
    if(!stats[d]) stats[d] = { valid:0, due:0, overdue:0, notdone:0, total:0 };
    var s = stats[d];
    s.total++;
    if(row.status.code==='valid') s.valid++;
    else if(row.status.code==='due') s.due++;
    else if(row.status.code==='overdue') s.overdue++;
    else if(row.status.code==='notdone') s.notdone++;
  });
  return stats;
}
function trnCourseStats(includeInactive){
  var stats = {};
  trnCourses().forEach(function(c){ stats[c.key] = { valid:0, due:0, overdue:0, notdone:0, total:0, name:c.name }; });
  trnAllRequiredStatuses(includeInactive).forEach(function(row){
    var s = stats[row.courseKey];
    if(!s) return;
    s.total++;
    if(row.status.code==='valid') s.valid++;
    else if(row.status.code==='due') s.due++;
    else if(row.status.code==='overdue') s.overdue++;
    else if(row.status.code==='notdone') s.notdone++;
  });
  return stats;
}
function trnUpcomingList(includeInactive){
  // Everyone with a computable next-due date that's due-soon or already overdue.
  var out = [];
  trnAllRequiredStatuses(includeInactive).forEach(function(row){
    if(row.status.code==='due' || row.status.code==='overdue'){
      out.push({ emp:row.emp, courseKey:row.courseKey, course:trnCourseByKey(row.courseKey), status:row.status });
    }
  });
  out.sort(function(a,b){
    var da = a.status.daysToDue==null ? 999999 : a.status.daysToDue;
    var db = b.status.daysToDue==null ? 999999 : b.status.daysToDue;
    return da-db;
  });
  return out;
}
function trnLastNMonthsCounts(timestamps, months){
  var map = {}, out = [];
  var now = new Date();
  for(var i=months-1;i>=0;i--){
    var d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    var key = d.toISOString().slice(0,7);
    map[key]=0; out.push(key);
  }
  (timestamps||[]).forEach(function(ts){
    if(!ts) return;
    var key = String(ts).slice(0,7);
    if(key in map) map[key]++;
  });
  return out.map(function(k){ return [k, map[k]]; });
}

/* ============================== NAV / SHELL ============================== */
var TRN_TAB_LABELS = { dashboard:'Dashboard', matrix:'Training Matrix', forms:'Forms', records:'Records', upcoming:'Upcoming / Planner', manage:'Manage' };
function trnTabList(){
  var tabs = ['dashboard','matrix','forms','records','upcoming'];
  if(typeof adminMode!=='undefined' && adminMode) tabs.push('manage'); // Master Data management — Edit Portal only
  return tabs;
}
function renderTraining(){
  var wrap = document.getElementById('training-body');
  if(!wrap) return;
  var tabs = trnTabList();
  if(tabs.indexOf(_trnTab)===-1) _trnTab = 'dashboard';
  wrap.innerHTML =
    '<div class="trn-tabs" id="trn-tabs">' +
      tabs.map(function(t){
        return '<button type="button" class="nav-btn trn-tab-btn'+(t===_trnTab?' active':'')+'" onclick="trnSetTab(\''+t+'\')" style="background:#fef2f2;color:#dc2626;font-weight:700">'+TRN_TAB_LABELS[t]+'</button>';
      }).join('') +
    '</div>' +
    '<div id="trn-pane" class="trn-pane"></div>';
  trnRenderPane();
}
function trnSetTab(t){
  _trnTab = t;
  renderTraining();
}
function trnRenderPane(){
  var pane = document.getElementById('trn-pane');
  if(!pane) return;
  try{
    if(_trnTab==='dashboard') pane.innerHTML = trnBuildDashboard();
    else if(_trnTab==='matrix') pane.innerHTML = trnBuildMatrix();
    else if(_trnTab==='forms') pane.innerHTML = trnBuildFormsHome();
    else if(_trnTab==='records') pane.innerHTML = trnBuildRecords();
    else if(_trnTab==='upcoming') pane.innerHTML = trnBuildUpcoming();
    else if(_trnTab==='manage') pane.innerHTML = (adminMode ? trnBuildManage() : '<div class="empty-state"><div class="empty-state-title">Requires Edit Portal mode</div></div>');
  }catch(err){
    console.error('Training pane render failed', err);
    pane.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⚠</div><div class="empty-state-title">Training module unavailable</div><div class="empty-state-hint">'+escHtml(err.message||'')+'</div></div>';
  }
}

/* ================================ MANAGE (Master Data — Edit Portal only) ================================ */
function trnBuildManage(){
  var courses = trnCourses(true).sort(function(a,b){ return a.name.localeCompare(b.name); });
  var rows = courses.map(function(c){
    var inactiveTag = c.active===false ? ' <span class="trn-inactive-badge">Inactive</span>' : '';
    return '<tr><td style="text-align:left;font-weight:700">'+escHtml(c.name)+inactiveTag+'</td><td>'+escHtml(c.freqLabel||'—')+'</td><td>'+escHtml(c.hours!=null?String(c.hours):'—')+'</td>'
      + '<td><button type="button" class="btn-ghost" style="font-size:.68rem" onclick="trnPromptEditCourse(\''+c.key+'\')">Edit</button> '
      + (c.active===false
        ? '<button type="button" class="btn-ghost" style="font-size:.68rem" onclick="trnSetCourseActive(\''+c.key+'\',true)">Reactivate</button>'
        : '<button type="button" class="btn-ghost" style="font-size:.68rem" onclick="trnSetCourseActive(\''+c.key+'\',false)">Deactivate</button>')
      + '</td></tr>';
  }).join('');
  var log = (safetyData.trainingMasterAudit||[]).slice(0, 30);
  var auditRows = log.map(function(a){
    return '<tr><td style="text-align:left">'+escHtml((a.at||'').slice(0,16).replace('T',' '))+'</td><td style="text-align:left">'+escHtml(a.entity)+'</td><td style="text-align:left">'+escHtml(a.entityId)+'</td><td style="text-align:left">'+escHtml(a.field)+'</td><td>'+escHtml(String(a.oldVal))+'</td><td>'+escHtml(String(a.newVal))+'</td><td style="text-align:left">'+escHtml(a.by)+'</td></tr>';
  }).join('');
  return '<div class="page-title" style="margin-bottom:2px">Manage Training Master Data</div>'
    + '<div class="page-sub">Business configuration for Training & TBT — visible only in Edit Portal mode. Historical attendance/matrix records are never affected by changes here.</div>'
    + '<div class="pbi-card" style="margin-top:14px"><div class="pbi-card-title">Training Courses</div>'
      + '<div style="margin-bottom:10px"><button type="button" class="btn-primary" onclick="trnPromptAddCourse()">+ Add Training Course</button></div>'
      + '<div style="overflow:auto"><table class="pbi-table"><thead><tr><th style="text-align:left;background:#1e3a5f">Course</th><th style="background:#1e3a5f">Frequency</th><th style="background:#1e3a5f">Hours</th><th style="background:#1e3a5f">Actions</th></tr></thead><tbody>'+(rows||'<tr><td colspan="4">No courses</td></tr>')+'</tbody></table></div>'
    + '</div>'
    + '<div class="pbi-card" style="margin-top:14px"><div class="pbi-card-title">Recent Master Data Changes</div>'
      + '<div style="overflow:auto"><table class="pbi-table"><thead><tr><th style="text-align:left;background:#1e3a5f">When</th><th style="text-align:left;background:#1e3a5f">Entity</th><th style="text-align:left;background:#1e3a5f">ID</th><th style="text-align:left;background:#1e3a5f">Field</th><th style="background:#1e3a5f">From</th><th style="background:#1e3a5f">To</th><th style="text-align:left;background:#1e3a5f">By</th></tr></thead><tbody>'+(auditRows||'<tr><td colspan="7">No changes logged yet</td></tr>')+'</tbody></table></div>'
    + '</div>';
}
function trnPromptAddCourse(){
  var name = prompt('New Training Course name:');
  if(name==null || !name.trim()) return;
  var freqLabel = prompt('Frequency label (e.g. "1 year", "3 years") — leave blank if not recurring:', '');
  var freqDays = '';
  if(freqLabel){
    freqDays = prompt('Frequency in days (e.g. 365 for 1 year, 1095 for 3 years):', '');
  }
  var hours = prompt('Attending hours (optional):', '');
  trnAddCourse(name, freqLabel||null, freqDays||null, hours||null);
  trnRenderPane();
}
function trnPromptEditCourse(key){
  var c = trnCourseByKey(key);
  if(!c) return;
  var name = prompt('Course name:', c.name);
  if(name==null || !name.trim()) return;
  var freqLabel = prompt('Frequency label:', c.freqLabel||'');
  var freqDays = prompt('Frequency in days:', c.freqDays!=null?String(c.freqDays):'');
  var hours = prompt('Attending hours:', c.hours!=null?String(c.hours):'');
  trnEditCourse(key, { name:name.trim(), freqLabel:freqLabel||null, freqDays:freqDays?parseInt(freqDays,10):null, hours:hours?parseFloat(hours):null });
}

/* ================================ DASHBOARD ================================ */
function trnBuildDashboard(){
  if(typeof TRAINING_DATA==='undefined'){
    return '<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-title">Training data not loaded</div><div class="empty-state-hint">training-data.js failed to load.</div></div>';
  }
  var rows = trnAllRequiredStatuses(false);
  var total = rows.length;
  var valid = rows.filter(function(r){return r.status.code==='valid';}).length;
  var due = rows.filter(function(r){return r.status.code==='due';}).length;
  var overdue = rows.filter(function(r){return r.status.code==='overdue';}).length;
  var notdone = rows.filter(function(r){return r.status.code==='notdone';}).length;
  var compliancePct = total ? Math.round(valid/total*100) : 100;
  var activeEmp = trnEmployees().filter(function(e){return e.active!==false;}).length;

  var kpis = [
    {l:'Overall Compliance', v:compliancePct+'%', s:valid+' / '+total+' required items', c: compliancePct>=90?'#16a34a':compliancePct>=75?'#d97706':'#dc2626'},
    {l:'Active Employees', v:activeEmp, s:trnEmployees().length+' total on file', c:'#1e3a5f'},
    {l:'Overdue / Expired', v:overdue, s:'Need immediate action', c:overdue>0?'#dc2626':'#64748b'},
    {l:'Due Soon (≤180d)', v:due, s:'Plan ahead', c:due>0?'#d97706':'#64748b'},
    {l:'Not Completed', v:notdone, s:'No date on file', c:notdone>0?'#b91c1c':'#64748b'}
  ];

  var completionDonut = [['Valid', valid, TRN_STATUS_COLOR.valid], ['Due Soon', due, TRN_STATUS_COLOR.due], ['Overdue', overdue, TRN_STATUS_COLOR.overdue], ['Not Completed', notdone, TRN_STATUS_COLOR.notdone]].filter(function(d){return d[1]>0;});

  var deptStats = trnDeptStats(false);
  var deptCompliance = Object.keys(deptStats).map(function(d){
    var s = deptStats[d];
    var pct = s.total ? Math.round(s.valid/s.total*100) : null;
    return {d:d, pct:pct, s:s};
  }).filter(function(x){return x.pct!==null;}).sort(function(a,b){return a.pct-b.pct;});
  var compBars = deptCompliance.map(function(x){ return [x.d, x.pct]; });
  var compColors = deptCompliance.map(function(x){ return x.pct>=90?'#16a34a':x.pct>=75?'#d97706':'#dc2626'; });

  var outstandingBars = deptCompliance.map(function(x){ return [x.d, x.s.overdue+x.s.notdone]; })
    .sort(function(a,b){return b[1]-a[1];}).slice(0,10);

  var courseStats = trnCourseStats(false);
  var courseBars = Object.keys(courseStats).map(function(k){
    var s = courseStats[k];
    var pct = s.total ? Math.round(s.valid/s.total*100) : null;
    return {k:k, name:s.name, pct:pct};
  }).filter(function(x){return x.pct!==null;}).sort(function(a,b){return a.pct-b.pct;}).slice(0,10);
  var courseBarEntries = courseBars.map(function(x){ return [x.name.length>22?x.name.slice(0,20)+'…':x.name, x.pct]; });
  var courseBarColors = courseBars.map(function(x){ return x.pct>=90?'#16a34a':x.pct>=75?'#d97706':'#dc2626'; });

  var upcoming = trnUpcomingList(false);
  var up30 = upcoming.filter(function(u){return u.status.code==='overdue' || (u.status.daysToDue!=null && u.status.daysToDue<=30);}).length;
  var up60 = upcoming.filter(function(u){return u.status.daysToDue!=null && u.status.daysToDue>30 && u.status.daysToDue<=60;}).length;
  var up90 = upcoming.filter(function(u){return u.status.daysToDue!=null && u.status.daysToDue>60 && u.status.daysToDue<=90;}).length;
  var upBars = [['Overdue / ≤30 days', up30], ['31–60 days', up60], ['61–90 days', up90]];
  var upColors = ['#dc2626','#d97706','#2563eb'];

  var records = trnRecordsArr();
  var monthly = trnLastNMonthsCounts(records.map(function(r){return r.timestamp||r.date;}), 6);

  var main = '<div class="pbi-layout">';
  main += portalBiSideNav('Training Modules', [
    {key:'all', label:'Overview', val:''},
    {key:'matrix', label:'Training Matrix', view:'training', val:total},
    {key:'upcoming', label:'Upcoming / Planner', view:'training', val:up30},
    {key:'forms', label:'Attendance / TBT Forms', view:'training', val:''},
    {key:'records', label:'Training Records', view:'training', val:records.length}
  ], 'training');
  main += '<div class="pbi-main">'+portalBiProdKpis(kpis);
  main += '<div class="pbi-grid-2">';
  main += '<div class="pbi-card"><div class="pbi-card-title">Completion Overview</div>'+(typeof buildDonutChart==='function'?buildDonutChart(completionDonut, total):'')+'</div>';
  main += '<div class="pbi-card"><div class="pbi-card-title">Upcoming Training (30 / 60 / 90 Days)</div>'+(typeof buildBarChart==='function'?buildBarChart(upBars, upColors):'')+'</div>';
  main += '</div>';
  main += '<div class="pbi-grid-2">';
  main += '<div class="pbi-card"><div class="pbi-card-title">Compliance by Department (%)</div>'+(compBars.length && typeof buildBarChart==='function'?buildBarChart(compBars, compColors):'<div class="empty-state empty-state-sm">No data</div>')+'</div>';
  main += '<div class="pbi-card"><div class="pbi-card-title">Outstanding by Department (Overdue + Not Completed)</div>'+(outstandingBars.length && typeof buildBarChart==='function'?buildBarChart(outstandingBars):'<div class="empty-state empty-state-sm">No data</div>')+'</div>';
  main += '</div>';
  main += '<div class="pbi-grid-2">';
  main += '<div class="pbi-card"><div class="pbi-card-title">Compliance by Course (Lowest 10)</div>'+(courseBarEntries.length && typeof buildBarChart==='function'?buildBarChart(courseBarEntries, courseBarColors):'<div class="empty-state empty-state-sm">No data</div>')+'</div>';
  main += '<div class="pbi-card"><div class="pbi-card-title">Monthly Training Activity (Attendance + TBT records)</div>'+(typeof buildTrendChart==='function'?buildTrendChart(monthly):'')+'</div>';
  main += '</div>';
  main += '</div></div>';

  return portalBiShell({
    theme:'safety',
    title:'Training & TBT Management Dashboard',
    tabsHtml:'<button type="button" class="pbi-tab active">Training Overview</button><button type="button" class="pbi-tab" onclick="trnSetTab(\'matrix\')">Open Matrix</button><button type="button" class="pbi-tab" onclick="trnSetTab(\'upcoming\')">Upcoming</button>',
    body: main,
    footer: 'Training & TBT · EHS Training Matrix · F/HSE/101 · F/HSE/102 — live calculated data'
  });
}

/* ================================= MATRIX =================================== */
function trnJobTitlesForDept(dept){
  var set = {};
  trnRequirements().forEach(function(r){ if(dept==='all' || r.department===dept) set[r.jobTitle]=1; });
  return Object.keys(set).sort();
}
function trnFilteredEmployees(){
  var f = _trnMatrixFilter;
  var list = trnEmployees().filter(function(e){
    if(!f.includeInactive && trnIsExcluded(e)) return false;
    if(f.dept!=='all' && e.department!==f.dept) return false;
    if(f.jobTitle!=='all' && e.jobTitle!==f.jobTitle) return false;
    if(f.manager!=='all' && e.manager!==f.manager) return false;
    if(f.q){
      var q = f.q.toLowerCase();
      if((e.name||'').toLowerCase().indexOf(q)===-1 && (e.id||'').toLowerCase().indexOf(q)===-1) return false;
    }
    if(f.course!=='all' && f.status!=='all'){
      var st = trnStatusFor(e, f.course);
      if(st.code!==f.status) return false;
    } else if(f.status!=='all' && f.course==='all'){
      var required = trnRequiredCourseKeys(e.department, e.jobTitle);
      var hit = required.some(function(ck){ return trnStatusFor(e, ck).code===f.status; });
      if(!hit) return false;
    }
    return true;
  });
  if(f.course!=='all'){
    list.sort(function(a,b){
      var order = {overdue:0, due:1, notdone:2, valid:3, notreq:4, excluded:5};
      var sa = trnStatusFor(a, f.course).code, sb = trnStatusFor(b, f.course).code;
      return (order[sa]||9) - (order[sb]||9) || a.name.localeCompare(b.name);
    });
  } else {
    list.sort(function(a,b){ return a.name.localeCompare(b.name); });
  }
  return list;
}
function trnStatusDot(status){
  var title = status.label + (status.date?(' · Completed '+status.date):'') + (status.nextDue?(' · Next due '+status.nextDue):'');
  return '<span class="trn-dot" title="'+escHtml(title)+'" style="background:'+status.color+'"></span>';
}
function trnBuildMatrix(){
  if(typeof TRAINING_DATA==='undefined') return '<div class="empty-state"><div class="empty-state-title">Training data not loaded</div></div>';
  return trnBuildMatrixHead() + '<div id="trn-matrix-results">' + trnBuildMatrixResults() + '</div>';
}
// Toolbar + filters + legend only — rebuilt on select/checkbox filter changes (dept/jobTitle/
// manager/course/status/includeInactive), NOT on every keystroke in the search box, so the
// search <input> DOM node is never destroyed while the user is typing (keeps focus + caret).
function trnBuildMatrixHead(){
  var f = _trnMatrixFilter;
  var courses = trnCourses();
  var total = trnFilteredEmployees().length;

  var deptOpts = ['<option value="all">All Departments</option>'].concat(trnDeptCodes().map(function(d){
    return '<option value="'+escHtml(d)+'"'+(f.dept===d?' selected':'')+'>'+escHtml(d)+'</option>';
  })).join('');
  var jtOpts = ['<option value="all">All Job Titles</option>'].concat(trnJobTitlesForDept(f.dept).map(function(j){
    return '<option value="'+escHtml(j)+'"'+(f.jobTitle===j?' selected':'')+'>'+escHtml(j)+'</option>';
  })).join('');
  var mgrOpts = ['<option value="all">All Managers</option>'].concat(trnManagers().map(function(m){
    return '<option value="'+escHtml(m.name)+'"'+(f.manager===m.name?' selected':'')+'>'+escHtml(m.name)+'</option>';
  })).join('');
  var courseOpts = ['<option value="all">All Courses (overview)</option>'].concat(courses.map(function(c){
    return '<option value="'+escHtml(c.key)+'"'+(f.course===c.key?' selected':'')+'>'+escHtml(c.name)+'</option>';
  })).join('');
  var statusOpts = ['all','valid','due','overdue','notdone','notreq'].map(function(s){
    var lbl = s==='all'?'All Statuses':TRN_STATUS_LABEL[s];
    return '<option value="'+s+'"'+(f.status===s?' selected':'')+'>'+lbl+'</option>';
  }).join('');

  var head = '<div class="trn-toolbar">'
    + '<div class="page-title" style="margin:0">Training Matrix</div>'
    + '<span class="empty-state-hint" id="trn-mx-count" style="margin-left:6px">'+total+' employees · '+courses.length+' courses</span>'
    + '<div class="trn-toolbar-actions">'
      + '<button type="button" class="btn-ghost" onclick="trnExportMatrix(false)">Export Full Matrix</button>'
      + '<button type="button" class="btn-ghost" onclick="trnExportMatrix(true)">Export Filtered Results</button>'
    + '</div>'
    + '</div>'
    + '<div class="trn-filters">'
      + '<input type="text" id="trn-mx-q" placeholder="Search name or ID…" value="'+escHtml(f.q)+'" oninput="trnMatrixFilterChange(\'q\',this.value)"/>'
      + '<select onchange="trnMatrixFilterChange(\'dept\',this.value)">'+deptOpts+'</select>'
      + '<select onchange="trnMatrixFilterChange(\'jobTitle\',this.value)">'+jtOpts+'</select>'
      + '<select onchange="trnMatrixFilterChange(\'manager\',this.value)">'+mgrOpts+'</select>'
      + '<select onchange="trnMatrixFilterChange(\'course\',this.value)">'+courseOpts+'</select>'
      + '<select onchange="trnMatrixFilterChange(\'status\',this.value)">'+statusOpts+'</select>'
      + '<label class="trn-inline-check"><input type="checkbox" '+(f.includeInactive?'checked':'')+' onchange="trnMatrixFilterChange(\'includeInactive\',this.checked)"/> Include inactive / resigned</label>'
    + '</div>';

  var legend = '<div class="trn-legend">' + ['valid','due','overdue','notdone','notreq'].map(function(s){
    return '<span class="trn-legend-item"><span class="trn-dot" style="background:'+TRN_STATUS_COLOR[s]+'"></span>'+TRN_STATUS_LABEL[s]+'</span>';
  }).join('') + '</div>';

  return head + legend;
}
// Table + pager (or empty state) only — this is what re-renders on every search keystroke.
function trnBuildMatrixResults(){
  var courses = trnCourses();
  var employees = trnFilteredEmployees();
  var total = employees.length;
  var pageSize = TRN_PAGE_SIZE;
  var pages = Math.max(1, Math.ceil(total/pageSize));
  if(_trnMatrixPage>pages) _trnMatrixPage = pages;
  if(_trnMatrixPage<1) _trnMatrixPage = 1;
  var startI = (_trnMatrixPage-1)*pageSize;
  var pageEmployees = employees.slice(startI, startI+pageSize);

  if(!total){
    return '<div class="empty-state"><div class="empty-state-icon">🔎</div><div class="empty-state-title">No employees match this filter</div><div class="empty-state-hint">Adjust the filters above.</div></div>';
  }

  var thead = '<tr><th class="trn-sticky-col trn-sticky-name">Employee</th><th class="trn-sticky-col trn-sticky-dept">Department</th><th class="trn-sticky-col trn-sticky-jt">Job Title</th>'
    + courses.map(function(c){ return '<th class="trn-course-th" title="'+escHtml(c.name)+(c.freqLabel?' · every '+escHtml(c.freqLabel):'')+'" onclick="trnOpenCourseDetail(\''+c.key+'\')">'+escHtml(c.name.length>16?c.name.slice(0,14)+'…':c.name)+'</th>'; }).join('')
    + '</tr>';

  var rows = pageEmployees.map(function(e){
    var inactiveTag = trnIsExcluded(e) ? ' <span class="trn-inactive-badge">Inactive</span>' : '';
    var cells = courses.map(function(c){
      return '<td class="trn-cell">'+trnStatusDot(trnStatusFor(e,c.key))+'</td>';
    }).join('');
    return '<tr>'
      + '<td class="trn-sticky-col trn-sticky-name" title="'+escHtml(e.name)+'"><a href="#" onclick="trnOpenEmployeeHistory(\''+e.id+'\');return false;">'+escHtml(e.name)+'</a>'+inactiveTag+'<div class="trn-sub">'+escHtml(e.id)+'</div></td>'
      + '<td class="trn-sticky-col trn-sticky-dept" title="'+escHtml(e.department)+'">'+escHtml(e.department)+'</td>'
      + '<td class="trn-sticky-col trn-sticky-jt" title="'+escHtml(e.jobTitle)+'">'+escHtml(e.jobTitle)+'</td>'
      + cells
      + '</tr>';
  }).join('');

  var table = '<div class="trn-matrix-wrap"><table class="trn-matrix-table"><thead>'+thead+'</thead><tbody>'+rows+'</tbody></table></div>';

  var pager = '<div class="trn-pager">'
    + '<button type="button" class="btn-ghost" '+(_trnMatrixPage<=1?'disabled':'')+' onclick="trnMatrixPage(-1)">← Prev</button>'
    + '<span>Page '+_trnMatrixPage+' of '+pages+' · showing '+(startI+1)+'–'+Math.min(startI+pageSize,total)+' of '+total+'</span>'
    + '<button type="button" class="btn-ghost" '+(_trnMatrixPage>=pages?'disabled':'')+' onclick="trnMatrixPage(1)">Next →</button>'
    + '</div>';

  return table + pager;
}
// Lightweight in-place update for the results container only — keeps the search <input>
// (and every other filter control) alive in the DOM so focus/caret are never lost.
function trnUpdateMatrixResults(){
  var results = document.getElementById('trn-matrix-results');
  if(!results){ trnRenderPane(); return; } // fallback if the pane isn't in its expected state
  results.innerHTML = trnBuildMatrixResults();
  var countEl = document.getElementById('trn-mx-count');
  if(countEl) countEl.textContent = trnFilteredEmployees().length + ' employees · ' + trnCourses().length + ' courses';
}
function trnMatrixFilterChange(key, val){
  if(key==='includeInactive') _trnMatrixFilter.includeInactive = !!val;
  else _trnMatrixFilter[key] = val;
  if(key==='dept') _trnMatrixFilter.jobTitle = 'all';
  _trnMatrixPage = 1;
  // Typing in the search box only needs the results re-rendered — every other filter
  // (dept/jobTitle/manager/course/status/includeInactive) can affect the toolbar itself
  // (e.g. dept changes the Job Title options) so those still do a full pane rebuild.
  if(key==='q' && _trnTab==='matrix') trnUpdateMatrixResults();
  else trnRenderPane();
}
function trnMatrixPage(delta){
  _trnMatrixPage += delta;
  if(_trnTab==='matrix') trnUpdateMatrixResults();
  else trnRenderPane();
}
function trnExportMatrix(filteredOnly){
  withBusy('Preparing Training Matrix Excel…', function(){ trnExportMatrixWork(filteredOnly); });
}
function trnExportMatrixWork(filteredOnly){
  if(typeof XLSX==='undefined'){ showToast('Excel export unavailable — required library did not load.','red'); return; }
  var courses = trnCourses();
  var employees = filteredOnly ? trnFilteredEmployees() : trnEmployees().filter(function(e){return e.active!==false;});
  var headers = ['Employee ID','Name','Department','Job Title','Manager','Active'].concat(courses.map(function(c){return c.name;}));
  var rows = employees.map(function(e){
    var base = [e.id, e.name, e.department, e.jobTitle, e.manager||'', e.active!==false?'Yes':'No'];
    var cells = courses.map(function(c){
      var st = trnStatusFor(e, c.key);
      if(st.code==='notreq') return 'Not Required';
      if(st.code==='excluded') return 'Inactive';
      return st.label + (st.date?(' ('+st.date+')'):'');
    });
    return base.concat(cells);
  });
  try{
    var wb = XLSX.utils.book_new();
    addStyledSheet(wb, 'Training Matrix', headers, rows, 'B91C1C');
    var now = new Date();
    var filename = 'Training_Matrix_'+now.toISOString().split('T')[0]+(filteredOnly?'_Filtered':'_Full')+'.xlsx';
    XLSX.writeFile(wb, filename, { bookType:'xlsx', type:'binary', cellStyles:true });
    showToast('Training Matrix exported: '+filename, 'green');
  }catch(err){ console.error('Training matrix export error', err); showToast('Export error: '+err.message, 'red'); }
}

/* ============================ EMPLOYEE / COURSE DETAIL ============================ */
function trnOpenEmployeeHistory(empId){
  var emp = trnEmpById(empId);
  if(!emp) return;
  var required = trnRequiredCourseKeys(emp.department, emp.jobTitle);
  var rows = required.map(function(ck){
    var c = trnCourseByKey(ck);
    var st = trnStatusFor(emp, ck);
    return '<tr><td style="text-align:left;font-weight:700">'+escHtml(c?c.name:ck)+'</td><td>'+escHtml(c&&c.freqLabel||'—')+'</td>'
      + '<td>'+escHtml(st.date||'—')+'</td><td>'+escHtml(st.nextDue||'—')+'</td>'
      + '<td><span style="color:'+st.color+';font-weight:800">'+st.label+'</span></td></tr>';
  }).join('');
  var recs = trnRecordsArr().filter(function(r){ return (r.attendees||[]).some(function(a){return a.empId===empId;}); })
    .sort(function(a,b){ return new Date(b.date||b.timestamp||0) - new Date(a.date||a.timestamp||0); });
  var recRows = recs.map(function(r){
    return '<tr><td style="text-align:left;font-weight:700">'+escHtml(r.formType==='tbt'?'TBT — '+ (r.topic||'') : 'Attendance — '+(r.title||''))+'</td>'
      + '<td>'+escHtml(r.date||'')+'</td><td><button type="button" class="btn-ghost" style="font-size:.7rem;padding:3px 8px" onclick="trnOpenRecord(\''+r.id+'\')">Open</button></td></tr>';
  }).join('');

  var body = '<div class="nm-form-grid">'
    + '<div class="form-row"><label>Employee</label><div style="padding:6px 0;font-weight:700">'+escHtml(emp.name)+'</div></div>'
    + '<div class="form-row"><label>ID</label><div style="padding:6px 0">'+escHtml(emp.id)+'</div></div>'
    + '<div class="form-row"><label>Department</label><div style="padding:6px 0">'+escHtml(emp.department)+'</div></div>'
    + '<div class="form-row"><label>Job Title</label><div style="padding:6px 0">'+escHtml(emp.jobTitle)+'</div></div>'
    + '<div class="form-row"><label>Manager</label><div style="padding:6px 0">'+escHtml(emp.manager||'—')+'</div></div>'
    + '<div class="form-row"><label>Status</label><div style="padding:6px 0">'+(trnIsExcluded(emp)?'<span style="color:#dc2626;font-weight:700">Inactive (resigned / relocated / transferred)</span>':'<span style="color:#16a34a;font-weight:700">Active</span>')+'</div></div>'
    + '</div>'
    + '<div class="pbi-card-title" style="margin-top:14px">Required Training</div>'
    + '<div style="overflow:auto"><table class="pbi-table"><thead><tr><th style="text-align:left;background:#1e3a5f">Course</th><th style="background:#1e3a5f">Frequency</th><th style="background:#1e3a5f">Last Completed</th><th style="background:#1e3a5f">Next Due</th><th style="background:#1e3a5f">Status</th></tr></thead><tbody>'+(rows||'<tr><td colspan="5">No required courses on file</td></tr>')+'</tbody></table></div>'
    + '<div class="pbi-card-title" style="margin-top:14px">Attendance / TBT History</div>'
    + '<div style="overflow:auto"><table class="pbi-table"><thead><tr><th style="text-align:left;background:#1e3a5f">Record</th><th style="background:#1e3a5f">Date</th><th style="background:#1e3a5f"></th></tr></thead><tbody>'+(recRows||'<tr><td colspan="3">No attendance/TBT records yet</td></tr>')+'</tbody></table></div>';

  trnOpenDetailModal('Employee Training History — '+emp.name, body);
}
function trnOpenCourseDetail(courseKey){
  var c = trnCourseByKey(courseKey);
  if(!c) return;
  var rows = trnAllRequiredStatuses(true).filter(function(r){ return r.courseKey===courseKey; });
  var byStatus = { valid:0, due:0, overdue:0, notdone:0, excluded:0 };
  rows.forEach(function(r){ if(byStatus[r.status.code]!=null) byStatus[r.status.code]++; });
  var reqRows = trnRequirements().filter(function(r){ return r.required.indexOf(courseKey)>=0; });
  var jtList = reqRows.map(function(r){ return '<span class="empty-state-hint" style="display:inline-block;background:var(--surface-2);border:1px solid var(--border);border-radius:99px;padding:2px 10px;margin:2px 4px 2px 0;font-size:.72rem;font-weight:700">'+escHtml(r.department+' — '+r.jobTitle)+'</span>'; }).join('');
  var outstanding = rows.filter(function(r){ return r.status.code==='overdue' || r.status.code==='notdone'; })
    .sort(function(a,b){ return a.emp.name.localeCompare(b.emp.name); });
  var outRows = outstanding.map(function(r){
    return '<tr><td style="text-align:left;font-weight:700"><a href="#" onclick="trnOpenEmployeeHistory(\''+r.emp.id+'\');return false;">'+escHtml(r.emp.name)+'</a></td><td>'+escHtml(r.emp.department)+'</td><td><span style="color:'+r.status.color+';font-weight:800">'+r.status.label+'</span></td></tr>';
  }).join('');

  var body = '<div class="nm-form-grid">'
    + '<div class="form-row"><label>Course</label><div style="padding:6px 0;font-weight:700">'+escHtml(c.name)+'</div></div>'
    + '<div class="form-row"><label>Frequency</label><div style="padding:6px 0">'+escHtml(c.freqLabel||'Not defined in source workbook')+'</div></div>'
    + '<div class="form-row"><label>Attending Hours</label><div style="padding:6px 0">'+escHtml(c.hours!=null?String(c.hours):'—')+'</div></div>'
    + '<div class="form-row"><label>Required for</label><div style="padding:6px 0">'+(reqRows.length)+' job title(s)</div></div>'
    + '</div>'
    + '<div class="pbi-card-title" style="margin-top:10px">Required Job Titles</div><div>'+(jtList||'—')+'</div>'
    + '<div class="pbi-card-title" style="margin-top:14px">Status Breakdown</div>'
    + (typeof buildDonutChart==='function'?buildDonutChart([['Valid',byStatus.valid,TRN_STATUS_COLOR.valid],['Due Soon',byStatus.due,TRN_STATUS_COLOR.due],['Overdue',byStatus.overdue,TRN_STATUS_COLOR.overdue],['Not Completed',byStatus.notdone,TRN_STATUS_COLOR.notdone]].filter(function(d){return d[1]>0;}), byStatus.valid+byStatus.due+byStatus.overdue+byStatus.notdone):'')
    + '<div class="pbi-card-title" style="margin-top:14px">Outstanding Employees</div>'
    + '<div style="overflow:auto"><table class="pbi-table"><thead><tr><th style="text-align:left;background:#1e3a5f">Employee</th><th style="background:#1e3a5f">Department</th><th style="background:#1e3a5f">Status</th></tr></thead><tbody>'+(outRows||'<tr><td colspan="3">None — fully compliant</td></tr>')+'</tbody></table></div>';

  trnOpenDetailModal('Course Detail — '+c.name, body);
}
function trnOpenDetailModal(title, bodyHtml){
  var modal = document.getElementById('training-detail-modal');
  if(!modal) return;
  document.getElementById('training-detail-title').textContent = title;
  document.getElementById('training-detail-body').innerHTML = bodyHtml;
  modal.classList.add('open');
}
function trnCloseDetailModal(){
  var modal = document.getElementById('training-detail-modal');
  if(modal) modal.classList.remove('open');
}

/* ================================ UPCOMING / PLANNER ================================ */
function trnBuildUpcoming(){
  if(typeof TRAINING_DATA==='undefined') return '<div class="empty-state"><div class="empty-state-title">Training data not loaded</div></div>';
  var all = trnUpcomingList(false);
  var buckets = {
    overdue: all.filter(function(u){return u.status.code==='overdue';}),
    d30: all.filter(function(u){return u.status.code==='due' && u.status.daysToDue<=30;}),
    d60: all.filter(function(u){return u.status.code==='due' && u.status.daysToDue>30 && u.status.daysToDue<=60;}),
    d90: all.filter(function(u){return u.status.code==='due' && u.status.daysToDue>60 && u.status.daysToDue<=90;})
  };
  var tabs = [
    {k:'all', l:'All ('+all.length+')'},
    {k:'overdue', l:'Overdue ('+buckets.overdue.length+')'},
    {k:'30', l:'Next 30 Days ('+buckets.d30.length+')'},
    {k:'60', l:'31–60 Days ('+buckets.d60.length+')'},
    {k:'90', l:'61–90 Days ('+buckets.d90.length+')'}
  ];
  var tabHtml = '<div class="trn-filters">' + tabs.map(function(t){
    return '<button type="button" class="nav-btn'+(_trnUpcomingBucket===t.k?' active':'')+'" style="background:#fef2f2;color:#dc2626;font-weight:700" onclick="trnSetUpcomingBucket(\''+t.k+'\')">'+t.l+'</button>';
  }).join('') + '</div>';

  var list = _trnUpcomingBucket==='all' ? all
    : _trnUpcomingBucket==='overdue' ? buckets.overdue
    : _trnUpcomingBucket==='30' ? buckets.d30
    : _trnUpcomingBucket==='60' ? buckets.d60
    : buckets.d90;

  var rows = list.map(function(u){
    var dueLabel = u.status.code==='overdue' ? ('<span style="color:#dc2626;font-weight:900">'+Math.abs(u.status.daysToDue)+'d overdue</span>') : ('<span style="color:#d97706;font-weight:800">'+u.status.daysToDue+'d left</span>');
    return '<tr>'
      + '<td style="text-align:left;font-weight:700"><a href="#" onclick="trnOpenEmployeeHistory(\''+u.emp.id+'\');return false;">'+escHtml(u.emp.name)+'</a></td>'
      + '<td>'+escHtml(u.emp.department)+'</td>'
      + '<td style="text-align:left">'+escHtml(u.course?u.course.name:u.courseKey)+'</td>'
      + '<td>'+escHtml(u.status.date||'—')+'</td>'
      + '<td>'+escHtml(u.status.nextDue||'—')+'</td>'
      + '<td>'+dueLabel+'</td>'
      + '</tr>';
  }).join('');

  // Department summary for the active bucket
  var byDept = {};
  list.forEach(function(u){ byDept[u.emp.department] = (byDept[u.emp.department]||0)+1; });
  var deptRows = Object.keys(byDept).sort(function(a,b){return byDept[b]-byDept[a];}).map(function(d){
    return '<tr><td style="text-align:left;font-weight:700">'+escHtml(d)+'</td><td>'+byDept[d]+'</td></tr>';
  }).join('');

  var table = list.length
    ? '<div style="overflow:auto"><table class="pbi-table"><thead><tr><th style="text-align:left;background:#1e3a5f">Employee</th><th style="background:#1e3a5f">Department</th><th style="text-align:left;background:#1e3a5f">Course</th><th style="background:#1e3a5f">Last Completed</th><th style="background:#1e3a5f">Next Due</th><th style="background:#1e3a5f">Status</th></tr></thead><tbody>'+rows+'</tbody></table></div>'
    : '<div class="empty-state"><div class="empty-state-icon">✅</div><div class="empty-state-title">Nothing in this bucket</div><div class="empty-state-hint">No training due in this window.</div></div>';

  var deptSummary = '<div class="pbi-card" style="margin-top:14px"><div class="pbi-card-title">Department Summary (this bucket)</div>'
    + (deptRows ? '<div style="overflow:auto"><table class="pbi-table"><thead><tr><th style="text-align:left;background:#0f766e">Department</th><th style="background:#0f766e">Items</th></tr></thead><tbody>'+deptRows+'</tbody></table></div>' : '<div class="empty-state empty-state-sm">No data</div>')
    + '</div>';

  return '<div class="page-title" style="margin-bottom:2px">Upcoming Training / Planner</div>'
    + '<div class="page-sub">Sorted by nearest due date first</div>'
    + tabHtml + table + deptSummary;
}
function trnSetUpcomingBucket(k){ _trnUpcomingBucket = k; trnRenderPane(); }

/* ============================ ATTENDEE COLUMN MODEL ============================
   Single source of truth for attendee-row shape so the on-screen editor, the
   Records archive detail view, and the official print templates always agree
   on column order/labels per form type (they differ — F/HSE/102 places
   "Name of plant" after Department; F/HSE/101 places "Company" before Job
   Title — this mirrors the real source workbooks exactly). */
function trnAttendeeCols(formType){
  if(formType==='tbt'){
    return [
      {key:'name', label:'Name'},
      {key:'idNo', label:'Employee ID/Dependent Contractor ID/Iqama #'},
      {key:'extra', label:'Company'},
      {key:'jobTitle', label:'Job Title (Position)'},
      {key:'department', label:'Department'},
      {key:'signature', label:'Signature'}
    ];
  }
  return [
    {key:'name', label:'Name'},
    {key:'idNo', label:'pladis ID or Iqama ID for Contractors'},
    {key:'jobTitle', label:'Job Title (Position)'},
    {key:'department', label:'Department'},
    {key:'extra', label:'Name of plant'},
    {key:'signature', label:'Signature'}
  ];
}
function trnAttendeeColsBi(){
  // Bilingual print-header labels for F/HSE/102, in the exact column order of trnAttendeeCols('attendance').
  return [
    nmBi('Name','الإسم'),
    nmBi('pladis ID or Iqama ID for Contractors','الرقم الوظيفي أو رقم الهوية للمتعاقدين'),
    nmBi('Job Title (Position)','المسمى الوظيفي'),
    nmBi('Department','القسم'),
    nmBi('Name of plant','المصنع'),
    nmBi('Signature','التوقيع')
  ];
}
function trnCourseLinkOptions(selected){
  var opts = '<option value="">— Not linked to Training Matrix —</option>';
  opts += trnCourses().map(function(c){
    return '<option value="'+escHtml(c.key)+'"'+(selected===c.key?' selected':'')+'>'+escHtml(c.name)+'</option>';
  }).join('');
  return opts;
}

/* ================================ FORMS HOME ================================ */
function trnBuildFormsHome(){
  var records = trnRecordsArr();
  var thisMonth = new Date().toISOString().slice(0,7);
  var attCount = records.filter(function(r){return r.formType==='attendance';}).length;
  var tbtCount = records.filter(function(r){return r.formType==='tbt';}).length;
  var attMonth = records.filter(function(r){return r.formType==='attendance' && (r.timestamp||'').slice(0,7)===thisMonth;}).length;
  var tbtMonth = records.filter(function(r){return r.formType==='tbt' && (r.timestamp||'').slice(0,7)===thisMonth;}).length;
  return '<div class="page-title" style="margin-bottom:2px">Training Forms</div>'
    + '<div class="page-sub">Digitized official forms — records save permanently into Training Records</div>'
    + '<div class="pbi-grid-2" style="margin-top:14px">'
      + '<div class="pbi-card">'
        + '<div class="pbi-card-title">Training Attendance Form — F/HSE/102</div>'
        + '<div class="empty-state-hint" style="margin-bottom:12px">'+attCount+' record(s) on file · '+attMonth+' this month</div>'
        + '<button type="button" class="btn-primary" onclick="trnOpenAttendanceForm()">+ New Training Attendance</button>'
      + '</div>'
      + '<div class="pbi-card">'
        + '<div class="pbi-card-title">Toolbox Talk Form — F/HSE/101</div>'
        + '<div class="empty-state-hint" style="margin-bottom:12px">'+tbtCount+' record(s) on file · '+tbtMonth+' this month</div>'
        + '<button type="button" class="btn-primary" onclick="trnOpenTBTForm()">+ New Toolbox Talk</button>'
      + '</div>'
    + '</div>';
}

/* ============================== ATTENDEE EDITOR ============================== */
function trnRenderAttendeesTable(){
  var cols = trnAttendeeCols(_trnFormType);
  var headHtml = '<th>#</th>' + cols.map(function(c){ return '<th>'+escHtml(c.label)+'</th>'; }).join('') + '<th></th>';
  var rows = _trnFormAttendees.map(function(a,i){
    var cells = cols.map(function(c){
      var ro = (c.key==='name'||c.key==='idNo') && a.empId;
      return '<td><input type="text" value="'+escHtml(a[c.key]||'')+'" '+(ro?'readonly title="Linked to Training Matrix — edit via employee record"':'')+' oninput="trnAttendeeEdit('+i+',\''+c.key+'\',this.value)"/></td>';
    }).join('');
    return '<tr><td>'+(i+1)+'</td>'+cells+'<td><button type="button" class="btn-ghost" onclick="trnRemoveAttendee('+i+')" title="Remove">✕</button></td></tr>';
  }).join('');
  return '<div class="trn-att-table-wrap"><table class="trn-att-table"><thead><tr>'+headHtml+'</tr></thead><tbody>'+rows+'</tbody></table></div>'
    + (rows?'':'<div class="empty-state empty-state-sm">No attendees added yet — use the buttons below.</div>');
}
function trnRefreshAttendeesUI(){
  var id = _trnFormType==='attendance' ? 'trn-att-attendees' : 'trn-tbt-attendees';
  var el = document.getElementById(id);
  if(el) el.innerHTML = trnRenderAttendeesTable();
}
function trnAttendeeEdit(i, key, val){
  if(!_trnFormAttendees[i]) return;
  _trnFormAttendees[i][key] = val;
  _trnFormDirty = true;
}
function trnRemoveAttendee(i){
  _trnFormAttendees.splice(i,1);
  _trnFormDirty = true;
  trnRefreshAttendeesUI();
}
function trnAddManualAttendee(){
  _trnFormAttendees.push({ empId:null, name:'', idNo:'', jobTitle:'', department:'', extra: _trnFormType==='attendance' ? 'FMC' : '', signature:'' });
  _trnFormDirty = true;
  trnRefreshAttendeesUI();
}

/* ============================== EMPLOYEE PICKER ============================== */
function trnOpenPicker(){
  _trnPickerCtx = { q:'', dept:'all' };
  var modal = document.getElementById('training-picker-modal');
  if(!modal) return;
  modal.classList.add('open');
  trnRenderPicker();
}
function trnClosePicker(){
  var modal = document.getElementById('training-picker-modal');
  if(modal) modal.classList.remove('open');
}
function trnRenderPicker(){
  var body = document.getElementById('training-picker-body');
  if(!body) return;
  body.innerHTML = trnBuildPickerHead() + '<div id="trn-picker-results">' + trnBuildPickerResults() + '</div>';
}
// Filters row only — rebuilt when the department select changes, NOT on every search
// keystroke (see trnPickerSearch), so the search <input> stays alive and keeps focus.
function trnBuildPickerHead(){
  var deptOpts = ['<option value="all">All Departments</option>'].concat(trnDeptCodes().map(function(d){
    return '<option value="'+escHtml(d)+'"'+(_trnPickerCtx.dept===d?' selected':'')+'>'+escHtml(d)+'</option>';
  })).join('');
  return '<div class="trn-filters">'
      + '<input type="text" placeholder="Search name or ID…" value="'+escHtml(_trnPickerCtx.q)+'" oninput="trnPickerSearch(this.value)"/>'
      + '<select onchange="trnPickerDept(this.value)">'+deptOpts+'</select>'
      + '<button type="button" class="btn-ghost" onclick="trnPickerSelectAllVisible()">Select All Visible</button>'
    + '</div>';
}
// Employee checkbox list only — this is what re-renders on every search keystroke.
function trnBuildPickerResults(){
  var addedIds = _trnFormAttendees.map(function(a){return a.empId;}).filter(Boolean);
  var matches = trnEmployees().filter(function(e){
    if(trnIsExcluded(e)) return false;
    if(_trnPickerCtx.dept!=='all' && e.department!==_trnPickerCtx.dept) return false;
    if(_trnPickerCtx.q){
      var q = _trnPickerCtx.q.toLowerCase();
      if((e.name||'').toLowerCase().indexOf(q)===-1 && (e.id||'').toLowerCase().indexOf(q)===-1) return false;
    }
    return true;
  });
  // The render cap only applies to an unfiltered/free-text browse (504 employees is too many to
  // paint at once) — once a specific department is chosen, show every match so "Select All
  // Visible" for that department is complete rather than silently dropping the tail (the largest
  // real department, Production, has 205 employees — a flat 200 cap would have clipped it).
  var cap = _trnPickerCtx.dept==='all' ? 200 : matches.length;
  var list = matches.slice(0, cap);
  var rows = list.map(function(e){
    var already = addedIds.indexOf(e.id)>=0;
    return '<label class="trn-pick-row'+(already?' trn-pick-added':'')+'"><input type="checkbox" data-emp="'+escHtml(e.id)+'" '+(already?'checked disabled':'')+'/> <b>'+escHtml(e.name)+'</b><span class="trn-sub">'+escHtml(e.id)+' · '+escHtml(e.department)+' · '+escHtml(e.jobTitle)+'</span></label>';
  }).join('');
  return '<div class="trn-pick-list" id="trn-pick-list">'+(rows||'<div class="empty-state empty-state-sm">No matching employees</div>')+'</div>'
    + (matches.length>cap?'<div class="empty-state-hint" style="margin-top:6px">Showing first '+cap+' of '+matches.length+' — refine your search.</div>':'');
}
function trnUpdatePickerResults(){
  var results = document.getElementById('trn-picker-results');
  if(!results){ trnRenderPicker(); return; }
  results.innerHTML = trnBuildPickerResults();
}
function trnPickerSearch(v){ _trnPickerCtx.q = v; trnUpdatePickerResults(); }
function trnPickerDept(v){ _trnPickerCtx.dept = v; trnRenderPicker(); }
function trnPickerSelectAllVisible(){
  document.querySelectorAll('#trn-pick-list input[type="checkbox"]:not(:disabled)').forEach(function(cb){ cb.checked = true; });
}
function trnPickerAddSelected(){
  var boxes = document.querySelectorAll('#trn-pick-list input[type="checkbox"]:checked:not(:disabled)');
  var added = 0;
  boxes.forEach(function(cb){
    var emp = trnEmpById(cb.getAttribute('data-emp'));
    if(!emp) return;
    if(_trnFormAttendees.some(function(a){return a.empId===emp.id;})) return;
    _trnFormAttendees.push({
      empId: emp.id, name: emp.name, idNo: emp.id, jobTitle: emp.jobTitle, department: emp.department,
      extra: _trnFormType==='attendance' ? (emp.location||'FMC') : 'pladis',
      signature: emp.name
    });
    added++;
  });
  _trnFormDirty = true;
  trnClosePicker();
  trnRefreshAttendeesUI();
  if(added) showToast(added+' attendee(s) added','green');
}

/* ============================ MATRIX ↔ RECORD INTEGRATION ============================ */
// Only writes an override when a record was explicitly linked to a Training Matrix course
// (never automatic for TBT, and never for an Attendance session left unlinked). Keeps the
// most recent completion date; never regresses a newer date already on file.
function trnApplyMatrixLink(rec, courseKey, dateStr){
  if(!dateStr || !courseKey) return;
  var ov = trnOverrides();
  (rec.attendees||[]).forEach(function(a){
    if(!a.empId) return;
    var emp = trnEmpById(a.empId);
    if(!emp) return;
    var current = trnCompletionDate(emp, courseKey);
    if(current && new Date(current) >= new Date(dateStr)) return;
    if(!ov[a.empId]) ov[a.empId] = {};
    ov[a.empId][courseKey] = { date: dateStr, source: rec.formType==='tbt' ? 'tbt' : 'attendance', recordId: rec.id };
  });
}

/* ================================ ATTENDANCE FORM ================================ */
function trnOpenAttendanceForm(record){
  _trnFormType = 'attendance';
  _trnEditingRecordId = record ? record.id : null;
  _trnFormAttendees = record ? JSON.parse(JSON.stringify(record.attendees||[])) : [];
  _trnFormDirty = false;
  document.getElementById('trn-att-title').value = record ? (record.title||'') : '';
  document.getElementById('trn-att-trainer').value = record ? (record.trainerName||'') : '';
  document.getElementById('trn-att-date').value = record ? (record.date||'') : '';
  document.getElementById('trn-att-time').value = record ? (record.time||'') : '';
  document.getElementById('trn-att-hours').value = record ? (record.hours||'') : '';
  document.getElementById('trn-att-course').innerHTML = trnCourseLinkOptions(record ? record.linkedCourseKey : '');
  document.getElementById('training-attendance-modal-title').textContent = record ? 'Edit Training Attendance — F/HSE/102' : 'New Training Attendance — F/HSE/102';
  trnRefreshAttendeesUI();
  document.getElementById('training-attendance-modal').classList.add('open');
}
function trnCloseAttendanceForm(){
  if(_trnFormDirty && !confirm('Discard unsaved attendance form changes?')) return;
  document.getElementById('training-attendance-modal').classList.remove('open');
  _trnFormDirty = false;
  _trnEditingRecordId = null;
}
function trnSaveAttendance(){
  var title = document.getElementById('trn-att-title').value.trim();
  var trainer = document.getElementById('trn-att-trainer').value.trim();
  var date = document.getElementById('trn-att-date').value;
  var time = document.getElementById('trn-att-time').value;
  var hours = document.getElementById('trn-att-hours').value;
  var course = document.getElementById('trn-att-course').value;
  if(!title){ showToast('Training Title is required','red'); return; }
  if(!date){ showToast('Starting Date is required','red'); return; }
  if(!_trnFormAttendees.length){ showToast('Add at least one attendee','red'); return; }

  var rec = _trnEditingRecordId ? trnRecordsArr().filter(function(r){return r.id===_trnEditingRecordId;})[0] : null;
  if(!rec){
    rec = { id:'TRN-'+Date.now()+'-'+Math.random().toString(36).slice(2,7), formType:'attendance', createdAt:new Date().toISOString(), createdBy:(currentUser&&currentUser.name)||'', history:[] };
    trnRecordsArr().unshift(rec);
  } else {
    rec.history = rec.history || [];
    rec.history.push({ at:new Date().toISOString(), by:(currentUser&&currentUser.name)||'', action:'edited' });
  }
  rec.title = title; rec.trainerName = trainer; rec.date = date; rec.time = time; rec.hours = hours;
  rec.linkedCourseKey = course || null;
  rec.attendees = JSON.parse(JSON.stringify(_trnFormAttendees));
  rec.timestamp = rec.timestamp || new Date().toISOString();
  rec.loggedBy = (currentUser&&currentUser.name)||'';

  if(rec.linkedCourseKey) trnApplyMatrixLink(rec, rec.linkedCourseKey, date);

  saveState();
  _trnFormDirty = false;
  var wasNew = !_trnEditingRecordId;
  _trnEditingRecordId = null;
  document.getElementById('training-attendance-modal').classList.remove('open');
  showToast(wasNew ? 'Training Attendance saved' : 'Training Attendance updated', 'green');
  trnSetTab('records');
}

/* ================================ TOOLBOX TALK FORM ================================ */
function trnOpenTBTForm(record){
  _trnFormType = 'tbt';
  _trnEditingRecordId = record ? record.id : null;
  _trnFormAttendees = record ? JSON.parse(JSON.stringify(record.attendees||[])) : [];
  _trnFormDirty = false;
  document.getElementById('trn-tbt-facility').value = record ? (record.facility||'') : '';
  document.getElementById('trn-tbt-conductor').value = record ? (record.conductedBy||'') : '';
  document.getElementById('trn-tbt-date').value = record ? (record.date||'') : '';
  document.getElementById('trn-tbt-time').value = record ? (record.time||'') : '';
  document.getElementById('trn-tbt-topicdesc').value = record ? (record.topic||'') : '';
  for(var i=1;i<=10;i++){
    document.getElementById('trn-tbt-topic'+i).value = record && record.topics ? (record.topics[i-1]||'') : '';
  }
  document.getElementById('trn-tbt-course').innerHTML = trnCourseLinkOptions(record ? record.linkedCourseKey : '');
  document.getElementById('trn-tbt-trainer').value = record ? (record.trainerName||'') : '';
  document.getElementById('training-tbt-modal-title').textContent = record ? 'Edit Toolbox Talk — F/HSE/101' : 'New Toolbox Talk — F/HSE/101';
  trnRefreshAttendeesUI();
  document.getElementById('training-tbt-modal').classList.add('open');
}
function trnCloseTBTForm(){
  if(_trnFormDirty && !confirm('Discard unsaved Toolbox Talk changes?')) return;
  document.getElementById('training-tbt-modal').classList.remove('open');
  _trnFormDirty = false;
  _trnEditingRecordId = null;
}
function trnSaveTBT(){
  var facility = document.getElementById('trn-tbt-facility').value.trim();
  var conductor = document.getElementById('trn-tbt-conductor').value.trim();
  var date = document.getElementById('trn-tbt-date').value;
  var time = document.getElementById('trn-tbt-time').value;
  var topicDesc = document.getElementById('trn-tbt-topicdesc').value.trim();
  var course = document.getElementById('trn-tbt-course').value;
  var trainer = document.getElementById('trn-tbt-trainer').value.trim();
  var topics = [];
  for(var i=1;i<=10;i++) topics.push(document.getElementById('trn-tbt-topic'+i).value.trim());
  if(!conductor){ showToast('Conducted By is required','red'); return; }
  if(!date){ showToast('Date is required','red'); return; }
  if(!_trnFormAttendees.length){ showToast('Add at least one attendee','red'); return; }

  var rec = _trnEditingRecordId ? trnRecordsArr().filter(function(r){return r.id===_trnEditingRecordId;})[0] : null;
  if(!rec){
    rec = { id:'TRN-'+Date.now()+'-'+Math.random().toString(36).slice(2,7), formType:'tbt', createdAt:new Date().toISOString(), createdBy:(currentUser&&currentUser.name)||'', history:[] };
    trnRecordsArr().unshift(rec);
  } else {
    rec.history = rec.history || [];
    rec.history.push({ at:new Date().toISOString(), by:(currentUser&&currentUser.name)||'', action:'edited' });
  }
  rec.facility = facility; rec.conductedBy = conductor; rec.date = date; rec.time = time;
  rec.topic = topicDesc; rec.topics = topics; rec.trainerName = trainer;
  rec.linkedCourseKey = course || null;
  rec.attendees = JSON.parse(JSON.stringify(_trnFormAttendees));
  rec.timestamp = rec.timestamp || new Date().toISOString();
  rec.loggedBy = (currentUser&&currentUser.name)||'';

  if(rec.linkedCourseKey) trnApplyMatrixLink(rec, rec.linkedCourseKey, date);

  saveState();
  _trnFormDirty = false;
  var wasNew = !_trnEditingRecordId;
  _trnEditingRecordId = null;
  document.getElementById('training-tbt-modal').classList.remove('open');
  showToast(wasNew ? 'Toolbox Talk saved' : 'Toolbox Talk updated', 'green');
  trnSetTab('records');
}

/* ================================ RECORDS ARCHIVE ================================ */
function trnFilteredRecordsArr(){
  var f = _trnRecordsFilter;
  return trnRecordsArr().filter(function(r){
    if(f.type!=='all' && r.formType!==f.type) return false;
    if(f.q){
      var q = f.q.toLowerCase();
      var hay = [(r.title||''), (r.topic||''), r.trainerName||'', r.conductedBy||'', (r.attendees||[]).map(function(a){return a.name;}).join(' ')].join(' ').toLowerCase();
      if(hay.indexOf(q)===-1) return false;
    }
    return true;
  }).sort(function(a,b){ return new Date(b.date||b.timestamp||0) - new Date(a.date||a.timestamp||0); });
}
function trnBuildRecords(){
  return trnBuildRecordsHead() + '<div id="trn-rec-results">' + trnBuildRecordsResults() + '</div>';
}
// Toolbar + filters only — rebuilt on the type-select change, NOT on every search keystroke
// (see trnRecordsFilterChange), so the search <input> stays alive and keeps focus while typing.
function trnBuildRecordsHead(){
  var f = _trnRecordsFilter;
  return '<div class="trn-toolbar"><div class="page-title" style="margin:0">Training Records</div>'
    + '<span class="empty-state-hint" id="trn-rec-count" style="margin-left:6px">'+trnFilteredRecordsArr().length+' record(s)</span></div>'
    + '<div class="trn-filters">'
      + '<input type="text" placeholder="Search title, trainer, attendee…" value="'+escHtml(f.q)+'" oninput="trnRecordsFilterChange(\'q\',this.value)"/>'
      + '<select onchange="trnRecordsFilterChange(\'type\',this.value)">'
        + '<option value="all"'+(f.type==='all'?' selected':'')+'>All Types</option>'
        + '<option value="attendance"'+(f.type==='attendance'?' selected':'')+'>Training Attendance (F/HSE/102)</option>'
        + '<option value="tbt"'+(f.type==='tbt'?' selected':'')+'>Toolbox Talk (F/HSE/101)</option>'
      + '</select>'
    + '</div>';
}
// Record cards only — this is what re-renders on every search keystroke.
function trnBuildRecordsResults(){
  var records = trnFilteredRecordsArr();
  if(!records.length){
    return '<div class="empty-state"><div class="empty-state-icon">🗂</div><div class="empty-state-title">No training records yet</div><div class="empty-state-hint">Use the Forms tab to log an Attendance or Toolbox Talk session.</div></div>';
  }

  return records.map(function(r){
    var typeTag = r.formType==='tbt' ? '<span style="color:#2563eb;font-weight:800">TBT · F/HSE/101</span>' : '<span style="color:#b91c1c;font-weight:800">Attendance · F/HSE/102</span>';
    var titleTxt = r.formType==='tbt' ? (r.topic || '(untitled Toolbox Talk)') : (r.title || '(untitled)');
    return '<div class="pro-list-card">'
      + '<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">'
        + '<div><div style="font-weight:800">'+escHtml(titleTxt)+'</div><div class="empty-state-hint">'+typeTag+' · '+escHtml(r.date||'')+' · '+(r.attendees||[]).length+' attendee(s)</div></div>'
        + '<div style="display:flex;gap:6px;flex-wrap:wrap">'
          + '<button type="button" class="btn-ghost" onclick="trnOpenRecord(\''+r.id+'\')">Open</button>'
          + '<button type="button" class="btn-ghost" onclick="trnPrintRecord(\''+r.id+'\')">Print</button>'
          + '<button type="button" class="btn-ghost" onclick="trnEditRecord(\''+r.id+'\')">Edit</button>'
        + '</div>'
      + '</div>'
      + '</div>';
  }).join('');
}
function trnUpdateRecordsResults(){
  var results = document.getElementById('trn-rec-results');
  if(!results){ trnRenderPane(); return; }
  results.innerHTML = trnBuildRecordsResults();
  var countEl = document.getElementById('trn-rec-count');
  if(countEl) countEl.textContent = trnFilteredRecordsArr().length + ' record(s)';
}
function trnRecordsFilterChange(key, val){
  _trnRecordsFilter[key] = val;
  if(key==='q' && _trnTab==='records') trnUpdateRecordsResults();
  else trnRenderPane();
}
function trnEditRecord(id){
  var r = trnRecordsArr().filter(function(x){return x.id===id;})[0];
  if(!r){ showToast('Record not found','red'); return; }
  if(r.formType==='tbt') trnOpenTBTForm(r); else trnOpenAttendanceForm(r);
}
function trnOpenRecord(id){
  var r = trnRecordsArr().filter(function(x){return x.id===id;})[0];
  if(!r){ showToast('Record not found','red'); return; }
  trnOpenDetailModal((r.formType==='tbt'?'Toolbox Talk — ':'Training Attendance — ')+(r.title||r.topic||''), trnRecordBodyHtml(r));
}
function trnRecordAttendeeTable(r){
  var cols = trnAttendeeCols(r.formType);
  var head = '<th>#</th>' + cols.map(function(c){ return '<th style="background:#1e3a5f'+(c.key==='name'?';text-align:left':'')+'">'+escHtml(c.label)+'</th>'; }).join('');
  var rows = (r.attendees||[]).map(function(a,i){
    return '<tr><td>'+(i+1)+'</td>'+cols.map(function(c){ return '<td'+(c.key==='name'?' style="text-align:left"':'')+'>'+escHtml(a[c.key]||'')+'</td>'; }).join('')+'</tr>';
  }).join('');
  return '<div style="overflow:auto"><table class="pbi-table"><thead><tr>'+head+'</tr></thead><tbody>'+(rows||'<tr><td colspan="'+(cols.length+1)+'">No attendees</td></tr>')+'</tbody></table></div>';
}
function trnRecordBodyHtml(r){
  var head = r.formType==='tbt'
    ? ('<div class="nm-form-grid">'
        + '<div class="form-row"><label>Facility/Function</label><div style="padding:6px 0">'+escHtml(r.facility||'—')+'</div></div>'
        + '<div class="form-row"><label>Conducted By</label><div style="padding:6px 0">'+escHtml(r.conductedBy||'—')+'</div></div>'
        + '<div class="form-row"><label>Date</label><div style="padding:6px 0">'+escHtml(r.date||'—')+'</div></div>'
        + '<div class="form-row"><label>Time</label><div style="padding:6px 0">'+escHtml(r.time||'—')+'</div></div>'
      + '</div>'
      + '<div class="form-row"><label>Topic Description</label><div style="padding:6px 0">'+escHtml(r.topic||'—')+'</div></div>'
      + '<div class="form-row"><label>Topics Discussed</label><div style="padding:6px 0">'+((r.topics||[]).filter(Boolean).map(function(t,i){return (i+1)+'. '+escHtml(t);}).join('<br>')||'—')+'</div></div>'
      + '<div class="form-row"><label>Trainer (Part C)</label><div style="padding:6px 0">'+escHtml(r.trainerName||'—')+'</div></div>')
    : ('<div class="nm-form-grid">'
        + '<div class="form-row"><label>Training Title</label><div style="padding:6px 0">'+escHtml(r.title||'—')+'</div></div>'
        + '<div class="form-row"><label>Trainer Name</label><div style="padding:6px 0">'+escHtml(r.trainerName||'—')+'</div></div>'
        + '<div class="form-row"><label>Starting Date</label><div style="padding:6px 0">'+escHtml(r.date||'—')+'</div></div>'
        + '<div class="form-row"><label>Starting Time</label><div style="padding:6px 0">'+escHtml(r.time||'—')+'</div></div>'
        + '<div class="form-row"><label>Total Training Hours</label><div style="padding:6px 0">'+escHtml(r.hours||'—')+'</div></div>'
      + '</div>');
  var linkTxt = r.linkedCourseKey ? (trnCourseByKey(r.linkedCourseKey) ? trnCourseByKey(r.linkedCourseKey).name : r.linkedCourseKey) : 'Not linked to Training Matrix';
  return head
    + '<div class="form-row"><label>Linked Matrix Course</label><div style="padding:6px 0">'+escHtml(linkTxt)+'</div></div>'
    + '<div class="pbi-card-title" style="margin-top:10px">Attendees ('+(r.attendees||[]).length+')</div>'
    + trnRecordAttendeeTable(r)
    + '<div style="margin-top:14px;display:flex;gap:8px">'
      + '<button type="button" class="btn-primary" onclick="trnPrintRecord(\''+r.id+'\')">Print</button>'
      + '<button type="button" class="btn-ghost" onclick="trnCloseDetailModal();trnEditRecord(\''+r.id+'\')">Edit</button>'
    + '</div>'
    + '<div class="empty-state-hint" style="margin-top:10px">Logged by '+escHtml(r.loggedBy||'')+' · '+escHtml((r.timestamp||'').slice(0,16).replace('T',' '))+'</div>';
}

/* ================================ OFFICIAL PRINT TEMPLATES ================================ */
var TRN_PRINT_CSS = `
  @page{ size:A4 portrait; margin:10mm; }
  body{ font-family:Arial,Helvetica,sans-serif; color:#000; background:#fff; font-size:11px; }
  table{ width:100%; border-collapse:collapse; }
  .trn-hdr td{ border:1px solid #000; padding:6px 8px; vertical-align:middle; }
  .trn-hdr .logo{ width:24%; text-align:center; }
  .trn-hdr .title{ width:46%; text-align:center; font-weight:900; font-size:16px; letter-spacing:.03em; }
  .trn-hdr .docref{ width:30%; text-align:center; font-weight:700; font-size:10.5px; }
  .trn-meta{ margin-top:0; }
  .trn-meta td{ border:1px solid #000; border-top:none; padding:5px 8px; font-size:10.5px; }
  .trn-meta label{ font-weight:700; margin-right:4px; }
  .trn-note{ border:1px solid #000; border-top:none; padding:6px 8px; font-size:9.5px; background:#f4f4f4; }
  .trn-att-tbl{ margin-top:0; }
  .trn-att-tbl th, .trn-att-tbl td{ border:1px solid #000; padding:4px 6px; font-size:9.5px; text-align:center; vertical-align:middle; }
  .trn-att-tbl thead{ display:table-header-group; }
  .trn-att-tbl tr{ page-break-inside:avoid; }
  .trn-att-tbl th{ background:#e8e8e8; font-weight:800; }
  .trn-foot{ border:1px solid #000; border-top:none; padding:6px 8px; font-size:9.5px; }
  bdi{ font-size:10px; }
  @media print{ body{ -webkit-print-color-adjust:exact; print-color-adjust:exact; } .trn-att-tbl th{ -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
`;
function trnPrintHeaderHtml(title, docRef){
  return '<table class="trn-hdr"><tr>'
    + '<td class="logo">'+(typeof NM_PLADIS_LOGO_B64!=='undefined' ? '<img src="'+NM_PLADIS_LOGO_B64+'" style="max-width:120px;max-height:46px"/>' : 'pladis')+'</td>'
    + '<td class="title">'+printEsc(title)+'</td>'
    + '<td class="docref">Document Ref.: '+printEsc(docRef)+'</td>'
    + '</tr></table>';
}
function trnAttendeeRowsPrint(attendees, formType){
  var cols = trnAttendeeCols(formType);
  if(!attendees || !attendees.length) return '<tr><td colspan="'+(cols.length+1)+'">—</td></tr>';
  return attendees.map(function(a,i){
    return '<tr><td>'+(i+1)+'</td>'+cols.map(function(c){ return '<td'+(c.key==='name'?' style="text-align:left"':'')+'>'+printEsc(a[c.key])+'</td>'; }).join('')+'</tr>';
  }).join('');
}
function trnAttendanceOfficialBody(r){
  var rows = trnAttendeeRowsPrint(r.attendees||[], 'attendance');
  var biCols = trnAttendeeColsBi();
  return trnPrintHeaderHtml('Training Attendance Form','F/HSE/102')
    + '<table class="trn-meta"><tr><td colspan="2">Issue Date: 20.01.2022 &nbsp;|&nbsp; Version Date: 20.01.2022</td></tr>'
      + '<tr><td style="width:50%"><label>Training Title:</label>'+printEsc(r.title)+'</td><td><label>Trainer Name:</label>'+printEsc(r.trainerName)+'</td></tr>'
      + '<tr><td><label>Starting Date:</label>'+printEsc(r.date)+'</td><td><label>Starting Time:</label>'+printEsc(r.time)+'</td></tr>'
      + '<tr><td colspan="2"><label>Total Training Hours:</label>'+printEsc(r.hours)+'</td></tr>'
    + '</table>'
    + '<div class="trn-note">'
      + '<div>Confirming that by signing the training record: 1. I attended this training at time mentioned above. 2. I understand the training material. 3. I will practice the training in the workplace without failing.</div>'
      + '<div dir="rtl" style="margin-top:4px">توقيع سجل الحضور: 1. لقد تدربت على هذا التدريب في الوقت المبين في السجل. 2. أستطيع فهم التدريب المعطى وأدوات التدريب. 3. سوف أعمل بما نص عليه التدريب في بيئة العمل بدون أي وقوع في الخطأ.</div>'
    + '</div>'
    + '<table class="trn-att-tbl"><thead><tr><th>NO.</th>'+biCols.map(function(h){return '<th>'+h+'</th>';}).join('')+'</tr></thead><tbody>'+rows+'</tbody></table>'
    + '<table class="trn-foot"><tr><td>Trainer Signature is required to confirm the above attendance.</td></tr>'
      + '<tr><td>Trainer Name: '+printEsc(r.trainerName)+' &nbsp;&nbsp;&nbsp; Signature: '+printEsc(r.trainerName)+'</td></tr>'
    + '</table>';
}
function trnTBTOfficialBody(r){
  var rows = trnAttendeeRowsPrint(r.attendees||[], 'tbt');
  var cols = trnAttendeeCols('tbt');
  var topicsHtml = (r.topics||[]).filter(Boolean).map(function(t,i){ return '<div>'+(i+1)+'. '+printEsc(t)+'</div>'; }).join('');
  return trnPrintHeaderHtml('Toolbox Talk Form','F/HSE/101')
    + '<table class="trn-meta"><tr><td colspan="2">Issue Date: 01 June 2022 &nbsp;|&nbsp; Version No.: 01 &nbsp;|&nbsp; Version Date: 01 June 2022</td></tr>'
      + '<tr><td colspan="2"><label>Part (A) — Facility/Function:</label>'+printEsc(r.facility)+'</td></tr>'
      + '<tr><td><label>Part (B) — Conducted by:</label>'+printEsc(r.conductedBy)+'</td><td><label>Date:</label>'+printEsc(r.date)+' &nbsp; <label>Time:</label>'+printEsc(r.time)+'</td></tr>'
      + '<tr><td colspan="2"><label>Topic Description:</label>'+printEsc(r.topic)+'</td></tr>'
    + '</table>'
    + '<div class="trn-note"><b>Toolbox Talk – Topics to be discussed</b>'+(topicsHtml||'<div>—</div>')+'</div>'
    + '<table class="trn-att-tbl"><thead><tr><th>#</th>'+cols.map(function(c){return '<th>'+escHtml(c.label)+'</th>';}).join('')+'</tr></thead><tbody>'+rows+'</tbody></table>'
    + '<table class="trn-foot"><tr><td>Part (C) — Trainer Name: '+printEsc(r.trainerName)+' &nbsp;&nbsp;&nbsp; Signature: '+printEsc(r.trainerName)+'</td></tr></table>';
}
function trnPrintRecord(id){
  var r = trnRecordsArr().filter(function(x){return x.id===id;})[0];
  if(!r){ showToast('Record not found','red'); return; }
  if(r.formType==='tbt') openPrintPreview('Toolbox Talk — F/HSE/101', trnTBTOfficialBody(r), TRN_PRINT_CSS);
  else openPrintPreview('Training Attendance — F/HSE/102', trnAttendanceOfficialBody(r), TRN_PRINT_CSS);
}

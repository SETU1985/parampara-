/* PARAMPARA REGRESSION SUITE — every fix we have made, asserted.
   Run before EVERY delivery.  node regress.js
   A fix that appears here can never quietly come back. */
const { chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright');
const CHROME='/home/claude/.cache/puppeteer/chrome/linux-131.0.6778.204/chrome-linux64/chrome';
const FILE='file:///home/claude/index.html';
const R=[]; const ok=(n,c,d)=>R.push({n,c,d:d||''});
const set=async(p,s,v)=>p.evaluate(([a,b])=>{const e=document.querySelector(a);if(!e)return 0;e.focus();e.value=b;
  e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));e.blur();return 1;},[s,v]);

(async()=>{
 const fs=require('fs');
 // ---------- static gates ----------
 const src=fs.readFileSync('/home/claude/index.html','utf8');
 const re=/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g;let m,i=0,last='';
 while(m=re.exec(src)){i++;last=m[1];fs.writeFileSync('/home/claude/_n'+i+'.js',m[1]);}
 try{ require('child_process').execSync('node --check /home/claude/_n'+i+'.js'); ok('JS parses',true); }
 catch(e){ ok('JS parses',false,String(e).slice(0,80)); }
 const a0=src.indexOf('const T={'), b0=src.indexOf('hi:{',a0);
 const en=src.slice(a0,b0);
 const endHi=src.indexOf('\n};',b0);
 const hi=src.slice(b0, endHi>0?endHi:b0+en.length);
 const keys=t=>new Set((t.match(/^\s*[a-z0-9_]+:'/gm)||[]).map(x=>x.trim().slice(0,-2)));
 const KE=keys(en), KH=keys(hi);
 const missHi=[...KE].filter(k=>!KH.has(k)), missEn=[...KH].filter(k=>!KE.has(k));
 ok('every key exists in BOTH languages', missHi.length===0&&missEn.length===0,
    KE.size+' EN / '+KH.size+' HI'+(missHi.length?'  missing in HI: '+missHi.slice(0,4):'')+(missEn.length?'  missing in EN: '+missEn.slice(0,4):''));
 ok('no (s) plurals left', !/\(s\)'/.test(src));
 ok('no dark surface hex left in <style>',
    !/background:#(1[0-9a-f]|2[0-9a-f]|3[0-9a-f])[0-9a-f]{4}(?![0-9a-f])/.test(src.slice(0,src.indexOf('</style>'))),
    'raw dark backgrounds');

 const ctx=await chromium.launchPersistentContext('/home/claude/_prof',{executablePath:CHROME,args:['--no-sandbox'],viewport:{width:390,height:844}});
 const p=ctx.pages()[0]||await ctx.newPage();
 const errs=[];p.on('pageerror',e=>errs.push('PE: '+e.message));p.on('console',c=>{if(c.type()==='error')errs.push('CE: '+c.text().slice(0,120));});
 p.on('dialog',async d=>{await d.accept()});
 await p.goto(FILE); await p.waitForTimeout(2600);

 // seed a known shop
 await p.evaluate(()=>{
   if(!DB.shopInfo||!DB.shopInfo.name){ DB.shopInfo={name:'TEST SHOP'}; }
   DB.customers=[{id:'c1',name:'Rahul Sharma',phone:'9830011223',m:{}}];
   DB.orders=[{id:'o1',created:new Date().toISOString(),orderNo:'1',customerId:'c1',customerName:'Rahul Sharma',
     phone:'9830011223',orderDate:todayISO(),deliveryDate:'2026-09-25',items:['coat'],m:{},design:{},
     payments:[{id:'p1',amt:5000,date:todayISO()}],total:12000,photos:[],voiceNotes:[]}];
   DB.staff=[{id:'s1',name:'Ramesh',role:'Salesman',salary:12000,commPct:0,startTime:'10:30',endTime:'21:30',joined:'2026-01-01',left:false,onBill:true}];
   save();
 });
 await p.reload(); await p.waitForTimeout(2400);

 // ---------- v585 header + nav ----------
 ok('header carries only BACKUP',
    (await p.evaluate(()=>[...document.querySelectorAll('.htools button')].length))===1);
 const nav=await p.evaluate(()=>[...document.querySelectorAll('nav button')].map(b=>b.id||'add'));
 ok('nav = home · orders · + · sale · menu', JSON.stringify(nav)===JSON.stringify(['nav-home','nav-orders','add','nav-invoices','nav-menu']), nav.join(','));
 ok('language row lives in Settings',
    await p.evaluate(async()=>{settingsMenu();await new Promise(r=>setTimeout(r,400));
      return [...document.querySelectorAll('button')].some(b=>/🌐/.test(b.innerText));}));
 await p.evaluate(()=>{closeModal();closeSheet();sheetReset();}); await p.waitForTimeout(300);

 // ---------- v584 plurals ----------
 const pl=await p.evaluate(()=>({one:t('col_left',{n:1}),many:t('col_left',{n:5}),piece:t('naap_start',{n:1})}));
 ok('plural picks the right word', pl.one==='1 bill still to collect' && pl.many==='5 bills still to collect' && /1 piece\)/.test(pl.piece), pl.one+' / '+pl.many);
 ok('no unresolved plural tokens',
    await p.evaluate(()=>{for(const k in T.en){const s=t(k,{n:1,o:1,c:1,u:1,i:1,b:1,of:1,all:1,d:1,g:1,p:1,r:1,a:1,v:1});
      if(/\{[a-z0-9_]*\|/.test(s))return false;} return true;}));

 // ---------- v584 drafts ----------
 const dft=await p.evaluate(()=>{localStorage.removeItem('pb_ob_drafts');
   putDraft('d1',{customerName:'A',phone:'9000000001'});
   putDraft('d2',{customerName:'A',phone:'9000000001'});
   putDraft('d3',{customerName:'A',phone:'9000000001',items:['coat']});
   putDraft('d4',{customerName:'A',phone:'9000000001'});
   return draftList().length;});
 ok('bare duplicate drafts collapse, real work kept', dft===2, dft+' left');

 // ---------- v588 item order ----------
 const order=await p.evaluate(()=>{DB.itemCfg=DB.itemCfg||{};
   DB.itemCfg.order=['coat','waistcoat','pant','sherwani'];DB.itemCfg.hide=[];save();
   return orderedItems().map(g=>catOf(g)).join(',');});
 ok('upper → lower → accessories holds', /^upper(,upper)*(,lower)+(,acc)*$/.test(order), order.slice(0,60));

 // ---------- v586 staff time boxes ----------
 await p.evaluate(()=>{sheetReset();closeSheet();staffMaster();}); await p.waitForTimeout(600);
 await p.evaluate(()=>{ if(typeof staffEdit==='function')staffEdit('s1'); }); await p.waitForTimeout(700);
 const tt=await p.evaluate(()=>['stIn','stOut'].map(id=>{const e=document.querySelector('#'+id);return e?e.type:'missing';}));
 ok('staff time boxes are real time pickers', tt.join(',')==='time,time', tt.join(','));

 // ---------- v586 ✕ closes everything, ← steps one ----------
 await p.evaluate(()=>{closeModal();closeSheet();sheetReset();staffMaster();}); await p.waitForTimeout(400);
 await p.evaluate(()=>staffPunch()); await p.waitForTimeout(500);
 const hadBack=await p.evaluate(()=>!!document.querySelector('#sheet .sheet-b'));
 await p.evaluate(()=>{document.querySelector('#sheet .sheet-x').click();}); await p.waitForTimeout(700);
 ok('✕ closes everything in one tap',
    hadBack && !(await p.evaluate(()=>document.querySelector('#scrim').classList.contains('show'))));
 await p.evaluate(()=>{sheetReset();staffMaster();}); await p.waitForTimeout(400);
 await p.evaluate(()=>staffPunch()); await p.waitForTimeout(500);
 await p.evaluate(()=>{document.querySelector('#sheet .sheet-b').click();}); await p.waitForTimeout(700);
 ok('← steps back exactly one page',
    (await p.evaluate(()=>(typeof _sheetCur!=='undefined'&&_sheetCur)?_sheetCur.name:''))==='staffMaster');

 // ---------- v594 back from a menu row that opened a TAB ----------
 await p.evaluate(()=>{closeSheet();sheetReset();go('home');}); await p.waitForTimeout(400);
 await p.evaluate(()=>menuHome()); await p.waitForTimeout(600);
 await p.evaluate(()=>menuGoTab('invoices')); await p.waitForTimeout(700);
 const onTab=await p.evaluate(()=>document.querySelector('.tabpane.active').id);
 await p.evaluate(()=>history.back()); await p.waitForTimeout(900);
 const backTo=await p.evaluate(()=>{const h=document.querySelector('#sheet h2');
   return (document.querySelector('#scrim').classList.contains('show')&&h)?h.innerText:document.querySelector('.tabpane.active').id;});
 ok('back from a menu row returns to All screens', onTab==='tab-invoices' && /All screens|सारी/.test(backTo), backTo);

 // ---------- v587 save-contact bar ----------
 await p.evaluate(()=>{closeSheet();sheetReset();DB.customers=[];save();}); await p.waitForTimeout(300);
 await p.evaluate(()=>openOrderForm()); await p.waitForTimeout(1000);
 await set(p,'#f_cname','New Person'); await set(p,'#f_cphone','9812345678'); await p.waitForTimeout(500);
 const bar=await p.evaluate(()=>{const b=document.querySelector('#cbar_ord');return b?b.innerText.trim():'';});
 ok('Save-contact appears on name + 10 digits', /Save contact|संपर्क/.test(bar), bar.slice(0,40));
 await p.evaluate(()=>cbSave('ord')); await p.waitForTimeout(500);
 ok('contact is saved without linking the order',
    (await p.evaluate(()=>DB.customers.length))===1 && !(await p.evaluate(()=>form.customerId)));

 // ---------- v590/v589 the invoice screen ----------
 await p.evaluate(()=>{sheetReset();closeSheet();}); await p.waitForTimeout(400);
 await p.evaluate(()=>openSaleForm()); await p.waitForTimeout(1000);
 ok('counter sale shows its number and date',
    /#INV/.test(await p.evaluate(()=>document.querySelector('#sheet').innerText)));
 ok('order no + delivery date sit on the counter-sale screen',
    await p.evaluate(()=>{const s=document.querySelector('#invOrdSlot');
      return !!(s&&s.querySelector('#inv_ddate')&&s.querySelector('#pos_ono'));}));
 ok('invoice no + date stay under ⚙️',
    await p.evaluate(()=>{const s=document.querySelector('#invDelySlot');
      return !!(s&&s.querySelector('#inv_no')&&s.querySelector('#inv_date'));}));
 await set(p,'#inv_ddate','2026-09-25'); await p.waitForTimeout(200);
 await p.evaluate(()=>renderInvoiceForm()); await p.waitForTimeout(500);
 ok('delivery date survives a redraw', (await p.evaluate(()=>invForm.deliveryDate))==='2026-09-25');

 // ---------- v592 where a saved bill lands ----------
 await p.evaluate(()=>{invForm.customerName='Walk-in';invForm.items=[{label:'Stole',qty:1,price:900,rate:900,incl:[],includes:'',hsn:''}];renderInvoiceForm();});
 await p.waitForTimeout(500);
 await p.evaluate(()=>saveInvoice()); await p.waitForTimeout(1500);
 ok('saving a bill lands on the bill list, no sheet',
    (await p.evaluate(()=>document.querySelector('.tabpane.active').id))==='tab-invoices'
    && !(await p.evaluate(()=>document.querySelector('#scrim').classList.contains('show'))));

 // ---------- v591 payment party picker ----------
 await p.evaluate(()=>{sheetReset();closeSheet();payEntry('in',1);}); await p.waitForTimeout(800);
 await p.evaluate(()=>payPartyPick('')); await p.waitForTimeout(400);
 const rows=await p.evaluate(()=>document.querySelector('#pyPartyResults').innerText);
 ok('payment picker lists parties with what they owe', /to get|लेना है/.test(rows), rows.split('\n')[0]||'');
 ok('payment box no longer uses the dead datalist',
    !(await p.evaluate(()=>document.querySelector('#py_party').getAttribute('list'))));
 await p.evaluate(()=>{const e=document.querySelector('#py_party');e.value='Zzz';e.dispatchEvent(new Event('input',{bubbles:true}));});
 await p.waitForTimeout(400);
 ok('an empty search offers Add new right there',
    /Add|बनाएँ/.test(await p.evaluate(()=>document.querySelector('#pyPartyResults').innerText)));

 // ---------- v582 money guards ----------
 await p.evaluate(()=>{closeModal();closeSheet();sheetReset();}); await p.waitForTimeout(300);
 const guarded=await p.evaluate(async()=>{const before=DB.orders.length; delOrder('o1');
   await new Promise(r=>setTimeout(r,500)); return {before,after:DB.orders.length,
     txt:(document.querySelector('#msheet')||{}).innerText||''};});
 ok('an order holding a payment cannot be deleted', guarded.after===guarded.before && /payment/i.test(guarded.txt), (guarded.txt.split('\n')[1]||'').slice(0,50));
 await p.evaluate(()=>closeModal()); await p.waitForTimeout(300);
 ok('missing-bill-numbers screen exists', await p.evaluate(()=>typeof billGaps==='function'));
 ok('a non-cash receipt never lands in Cash',
    await p.evaluate(()=>{const a=payAccFor('UPI','cash');const acc=(DB.accounts||[]).find(x=>x.id===a);
      return !!acc && !/cash/i.test(acc.type||acc.name||'');}));

 // ---------- v583 data safety ----------
 ok('boot recovery guard present', /function bootEvidence/.test(src) && /showLostScreen/.test(src));
 ok('openIDB has onblocked and a timeout', /onblocked/.test(src) && /openIDBOnce/.test(src));
 ok('a shrunken book will not overwrite a big backup',
    await p.evaluate(()=>{localStorage.setItem('pb_ob_bkrecs','230');const a=!!bkShrunk();
      localStorage.setItem('pb_ob_bkrecs','2');const b=!!bkShrunk();return a&&!b;}));

 // ---------- every screen still opens ----------
 await p.evaluate(()=>{closeSheet();sheetReset();go('home');}); await p.waitForTimeout(400);
 const walk=await p.evaluate(async()=>{menuHome();await new Promise(r=>setTimeout(r,500));
   const rows=[...document.querySelectorAll('#sheet .mnu-row')]; let bad=0,n=0;
   for(const r of rows){ n++; try{ r.click(); await new Promise(x=>setTimeout(x,220)); }catch(e){ bad++; }
     try{ closeSheet(); sheetReset(); menuHome(); await new Promise(x=>setTimeout(x,180)); }catch(e){} }
   return {n,bad};});
 ok('every All-screens row opens', walk.bad===0, walk.n+' rows');

 // ---------- the books ----------
 /* the fixture order above was injected straight into DB with a payment on it, which is
    NOT how money enters the app — no voucher was posted for it, so the trial balance would
    correctly report a ₹5,000 hole that the app did not create. Drop the fixture money
    before checking the books, so this test measures the app and not the fixture. */
 await p.evaluate(()=>{ (DB.orders||[]).forEach(o=>{ if(o.id==='o1')o.payments=[]; }); save(); });
 await p.evaluate(()=>{closeSheet();sheetReset();trialBalance();}); await p.waitForTimeout(1100);
 ok('trial balance balances', /Balanced|✅/.test(await p.evaluate(()=>document.querySelector('#sheet').innerText)));
 await p.evaluate(()=>{closeSheet();balanceSheet();}); await p.waitForTimeout(900);
 ok('balance sheet balances', /Balanced|✅/.test(await p.evaluate(()=>document.querySelector('#sheet').innerText)));

 ok('zero page or console errors in the whole run', errs.length===0, errs.slice(0,2).join(' | '));

 const pass=R.filter(r=>r.c).length;
 console.log('\n'+'═'.repeat(66));
 R.forEach(r=>console.log((r.c?'  PASS  ':'  FAIL  ')+r.n+(r.d?'   ['+r.d+']':'')));
 console.log('═'.repeat(66));
 console.log(pass+' / '+R.length+' passed'+(pass===R.length?'':'   ← FIX BEFORE DELIVERY'));
 await ctx.close();
 process.exit(pass===R.length?0:1);
})();

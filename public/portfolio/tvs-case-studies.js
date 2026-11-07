/* TVS Accelerator: four screen-led storyboards and detailed case studies.
   Original asset boards are rendered as cropped UI panels via canvas.
   External script intentionally runs before the portfolio's inline router. */
(function(){
"use strict";
const DB = {"screens":[{"id":"e01","file":"enq-hifi-1.jpg","x":0.38,"y":0.08,"w":0.59,"h":0.186,"layout":"board","title":"Launch an enquiry","desc":"Open Create New, select Enquiry rather than Booking"},{"id":"e02","file":"enq-hifi-1.jpg","x":0.38,"y":0.294,"w":0.59,"h":0.19,"layout":"board","title":"Capture the essentials","desc":"Customer name, mobile number, interested vehicles and follow-up"},{"id":"e03","file":"enq-hifi-1.jpg","x":0.38,"y":0.57,"w":0.59,"h":0.188,"layout":"board","title":"Confirm and save","desc":"Successful enquiry, basic information and interested vehicles"},{"id":"e04","file":"enq-hifi-1.jpg","x":0.38,"y":0.794,"w":0.59,"h":0.2,"layout":"board","title":"Make it visible","desc":"Enquiry appears in the list and needs follow-up"},{"id":"e05","file":"enq-hifi-2.jpg","x":0.38,"y":0.07,"w":0.59,"h":0.166,"layout":"board","title":"Complete at follow-up","desc":"Follow-up details, test rides and mandatory inputs"},{"id":"e06","file":"enq-hifi-2.jpg","x":0.38,"y":0.261,"w":0.59,"h":0.17,"layout":"board","title":"Fill in only what's needed","desc":"Edit the incomplete enquiry when information is available"},{"id":"e07","file":"enq-hifi-2.jpg","x":0.38,"y":0.452,"w":0.59,"h":0.163,"layout":"board","title":"Update the record","desc":"Basic and vehicle details stay connected"},{"id":"e08","file":"enq-hifi-2.jpg","x":0.38,"y":0.633,"w":0.59,"h":0.169,"layout":"board","title":"Gate booking responsibly","desc":"The system asks for missing essentials before booking"},{"id":"e09","file":"enq-hifi-2.jpg","x":0.38,"y":0.82,"w":0.59,"h":0.176,"layout":"board","title":"Finish before booking","desc":"Additional details and final follow-up fields"},{"id":"q01","file":"quotes-1.jpg","x":0.378,"y":0.111,"w":0.59,"h":0.271,"layout":"board","title":"Capture customer interest","desc":"Initial enquiry record and interested vehicle choices"},{"id":"q02","file":"quotes-1.jpg","x":0.378,"y":0.42,"w":0.59,"h":0.263,"layout":"board","title":"Reception desk flow","desc":"Receptionists capture walk-ins and initiate the enquiry"},{"id":"q03","file":"quotes-1.jpg","x":0.378,"y":0.721,"w":0.59,"h":0.274,"layout":"board","title":"Self-register with a QR","desc":"Customer-facing QR entry and vehicle preferences"},{"id":"q04","file":"quotes-2.jpg","x":0.378,"y":0.097,"w":0.59,"h":0.191,"layout":"board","title":"Quote sent on WhatsApp","desc":"Digital quotation reaches the customer's phone"},{"id":"q05","file":"quotes-2.jpg","x":0.378,"y":0.312,"w":0.59,"h":0.205,"layout":"board","title":"Retrieve sent quotes","desc":"Enquiry detail retains all generated quotations"},{"id":"q06","file":"quotes-2.jpg","x":0.378,"y":0.539,"w":0.59,"h":0.199,"layout":"board","title":"Generate vehicle quotations","desc":"Choose one or more vehicles to quote"},{"id":"q07","file":"quotes-2.jpg","x":0.378,"y":0.765,"w":0.59,"h":0.227,"layout":"board","title":"Edit prices and preview","desc":"Quotation configuration and generated document"},{"id":"q08","file":"quotes-3.jpg","x":0.378,"y":0.076,"w":0.59,"h":0.159,"layout":"board","title":"Manager menu","desc":"Quotation administration is available to managers"},{"id":"q09","file":"quotes-3.jpg","x":0.378,"y":0.26,"w":0.59,"h":0.161,"layout":"board","title":"Configure models","desc":"Select vehicles and variants for quotation templates"},{"id":"q10","file":"quotes-3.jpg","x":0.378,"y":0.446,"w":0.59,"h":0.16,"layout":"board","title":"Manage particulars and discounts","desc":"Add or remove charges and adjust template values"},{"id":"q11","file":"quotes-3.jpg","x":0.378,"y":0.631,"w":0.59,"h":0.164,"layout":"board","title":"Resend what was shared","desc":"Existing brochures and quotations remain accessible"},{"id":"q12","file":"quotes-3.jpg","x":0.378,"y":0.821,"w":0.59,"h":0.169,"layout":"board","title":"Customer portal","desc":"Customers can see their enquiry and saved quotes"},{"id":"flow","file":"enq-ideation.jpg","x":0.02,"y":0.01,"w":0.97,"h":0.97,"layout":"board","title":"Enquiry flow and impact mapping","desc":"Early cross-feature ideation"},{"id":"tvs","file":"tvs-banner.jpg","x":0.1,"y":0.01,"w":0.8,"h":0.98,"layout":"board","title":"TVS Accelerator original interface selection","desc":"Original portfolio montage"},{"id":"e01f","file":"enq-hifi-1.jpg","x":0.465,"y":0.08,"w":0.19,"h":0.186,"layout":"phone","title":"Opening the enquiry","desc":"Create New from the Accelerator dashboard"},{"id":"e02f","file":"enq-hifi-1.jpg","x":0.386,"y":0.294,"w":0.206,"h":0.19,"layout":"phone","title":"Quick Enquiry form","desc":"First-step customer and vehicle information"},{"id":"e03f","file":"enq-hifi-1.jpg","x":0.386,"y":0.57,"w":0.206,"h":0.188,"layout":"phone","title":"Enquiry recorded","desc":"The successful creation screen"},{"id":"e08f","file":"enq-hifi-2.jpg","x":0.785,"y":0.633,"w":0.19,"h":0.169,"layout":"phone","title":"Booking requires completion","desc":"Missing fields are highlighted before proceeding"},{"id":"q03f","file":"quotes-1.jpg","x":0.385,"y":0.722,"w":0.194,"h":0.272,"layout":"phone","title":"Customer QR","desc":"Scan to enquire at the dealership"},{"id":"q04f","file":"quotes-2.jpg","x":0.42,"y":0.097,"w":0.205,"h":0.191,"layout":"phone","title":"WhatsApp quotation","desc":"Instant digital handoff"},{"id":"q07f","file":"quotes-2.jpg","x":0.755,"y":0.765,"w":0.211,"h":0.227,"layout":"phone","title":"Quotation preview","desc":"See generated quote before sharing"},{"id":"q10f","file":"quotes-3.jpg","x":0.685,"y":0.447,"w":0.28,"h":0.157,"layout":"phone","title":"Manager pricing controls","desc":"Configure discount and charge particulars"},{"id":"e04f","file":"enq-hifi-1.jpg","x":0.47,"y":0.794,"w":0.195,"h":0.2,"layout":"phone","title":"Find the newly created enquiry","desc":"Original TVS app screen, isolated from its multi-screen presentation board"},{"id":"e05f","file":"enq-hifi-2.jpg","x":0.385,"y":0.07,"w":0.215,"h":0.166,"layout":"phone","title":"Follow-up and test ride fields","desc":"Original TVS app screen, isolated from its multi-screen presentation board"},{"id":"e06f","file":"enq-hifi-2.jpg","x":0.385,"y":0.261,"w":0.214,"h":0.17,"layout":"phone","title":"Edit the incomplete enquiry","desc":"Original TVS app screen, isolated from its multi-screen presentation board"},{"id":"e07f","file":"enq-hifi-2.jpg","x":0.383,"y":0.452,"w":0.215,"h":0.163,"layout":"phone","title":"Updated enquiry details","desc":"Original TVS app screen, isolated from its multi-screen presentation board"},{"id":"e09f","file":"enq-hifi-2.jpg","x":0.696,"y":0.82,"w":0.275,"h":0.176,"layout":"phone","title":"Complete remaining booking fields","desc":"Original TVS app screen, isolated from its multi-screen presentation board"},{"id":"q01f","file":"quotes-1.jpg","x":0.462,"y":0.111,"w":0.209,"h":0.271,"layout":"phone","title":"Create enquiry and select vehicles","desc":"Original TVS app screen, isolated from its multi-screen presentation board"},{"id":"q02f","file":"quotes-1.jpg","x":0.378,"y":0.42,"w":0.215,"h":0.263,"layout":"phone","title":"Reception desk customer capture","desc":"Original TVS app screen, isolated from its multi-screen presentation board"},{"id":"q05f","file":"quotes-2.jpg","x":0.748,"y":0.312,"w":0.218,"h":0.205,"layout":"phone","title":"Saved quotation history","desc":"Original TVS app screen, isolated from its multi-screen presentation board"},{"id":"q06f","file":"quotes-2.jpg","x":0.777,"y":0.539,"w":0.19,"h":0.199,"layout":"phone","title":"Choose variants for quotation","desc":"Original TVS app screen, isolated from its multi-screen presentation board"},{"id":"q08f","file":"quotes-3.jpg","x":0.398,"y":0.076,"w":0.234,"h":0.159,"layout":"phone","title":"Manager quotation settings","desc":"Original TVS app screen, isolated from its multi-screen presentation board"},{"id":"q09f","file":"quotes-3.jpg","x":0.68,"y":0.26,"w":0.266,"h":0.161,"layout":"phone","title":"Manager variant configuration","desc":"Original TVS app screen, isolated from its multi-screen presentation board"},{"id":"q11f","file":"quotes-3.jpg","x":0.777,"y":0.631,"w":0.188,"h":0.164,"layout":"phone","title":"Resend saved quotation","desc":"Original TVS app screen, isolated from its multi-screen presentation board"},{"id":"q12f","file":"quotes-3.jpg","x":0.753,"y":0.821,"w":0.215,"h":0.169,"layout":"phone","title":"Customer quotation portal","desc":"Original TVS app screen, isolated from its multi-screen presentation board"}],"cases":[{"key":"tvs","name":"TVS Accelerator","num":"01 / THE SYSTEM","role":"MAIN CASE STUDY","title":"The sales app was there. The sales team wasn't using it.","summary":"A dealership sales platform had a serious adoption problem. We went to the showroom floor to understand the workarounds, then redesigned the parts that mattered: enquiry capture and quotations.","intro":"A customer walks into a TVS showroom. The sales executive begins a conversation. A mobile app should make this easier—not compete for the customer's attention.","context":"TVS Accelerator supported the journey from enquiry through bookings, test rides and delivery. Sales executives needed speed; managers needed accurate, connected records. Too often, staff used paper because it was faster in the moment.","problem":"The issue wasn't simply an outdated interface. It was a workflow that asked for too much at the wrong moment, while the real work happened face to face.","people":"Sales executives wanted to stay engaged with customers. Branch managers wanted visibility into follow-ups and quotations. Dealer owners wanted consistent, comparable information.","approach":"We visited dealerships, observed sales conversations, interviewed executives and managers, prioritised with the business, then designed and tested the solutions in two-week sprints.","decisions":[["Observe the workaround","Paper was a tool users chose because it helped them stay present in the conversation."],["Separate immediate from later","Capture enough to create an enquiry, then complete the details through follow-ups."],["Make the digital quote useful","Let managers control prices and let executives send a quotation customers can keep."]],"screens":["e01","e02","e03","e05","e08","q03","q04","q07","q10"],"stats":[["5–10 min → ~10 sec","Reported enquiry capture time"],["5–7 min → <30 sec","Reported quotation generation"],["40% → 80%","Reported digital enquiry logging across the series"],["72% → 98%","Reported sales linked to an enquiry"]],"limits":"The numbers are presented as reported project results from the previous portfolio. They cover different stages of work and should not be attributed to any single screen.","reflection":"The most important change wasn't persuading people to use the app. It was changing the app to work with the way people sell.","prev":"#projects","next":"#tvs-research","nextLabel":"Research","previousLabel":"All projects"},{"key":"tvs-research","name":"Finding the friction","num":"02 / RESEARCH","role":"CASE STUDY 1","title":"The paper wasn't a habit. It was a workaround.","summary":"Before drawing screens, we visited the dealerships where the work happened. The findings shifted the brief from a visual refresh to changes in the sales journey.","intro":"We didn't start with a new interface. We started by watching what happened when a customer walked in.","context":"Dealership visits in Pune and Bengaluru showed sales executives juggling walk-ins, enquiries, test rides and quotes. Recording complete data in the app competed with the sales conversation.","problem":"Staff were protecting the customer interaction, not rejecting digital tools. A long form interrupted the conversation and paper was simply faster to reach for.","people":"Sales executives, branch managers and dealer owners needed different things: speed, visibility and consistency. Field visits revealed why a single rigid flow was working for none of them.","approach":"We conducted on-site observation, interviews and incognito visits, gathered the recurring pain points, and brought them back to the business. Impact versus effort helped align the team on what to change first.","decisions":[["Capture now, complete later","The enquiry form had to respect a live sales conversation."],["Build in follow-up visibility","Managers still needed complete data, not a permanent collection of partial leads."],["Prioritise rather than redesign everything","Quick Enquiry, digital quotation and delivery checklist became the key bets."]],"screens":["flow","e01","e02","e04","e05"],"stats":[["3","Priority bets identified"],["2-week","Reported design and review sprint cadence"]],"limits":"This research case study focuses on observed workarounds and prioritisation. No research participant count or quantified research uplift was provided; the adjacent screenshots show the resulting product direction.","reflection":"The best clue was the workaround itself. People were not behaving irrationally. They had found a way to serve customers faster.","prev":"#tvs","next":"#tvs-enquiry","nextLabel":"Quick Enquiry","previousLabel":"TVS overview"},{"key":"tvs-enquiry","name":"Quick Enquiry","num":"03 / ENQUIRY","role":"CASE STUDY 2","title":"A ten-minute form had no place in a ten-minute conversation.","summary":"Quick Enquiry separated the few fields needed immediately from the details needed later. The work extended into records, reminders, follow-ups and booking gates.","intro":"Someone comes in to ask about a scooter. The executive needs to get their name, number and interest without turning away from the conversation.","context":"The original form asked for detailed information up front. Some sales executives wrote it on paper and entered it much later, if at all. Late or missed entries meant missed follow-ups and poor reporting.","problem":"Speed and completeness seemed like opposite goals. The redesign had to give sales staff a genuinely quick first step without depriving managers of the information needed downstream.","people":"Sales executives needed a fast, forgiving first interaction; managers needed follow-up data and a traceable lead record.","approach":"We mapped the fields, split the flow into basic capture and later completion, then considered its consequences across enquiry lists, tasks, status indicators, reminders and booking. The source boards include nine interface sequences.","decisions":[["Capture the minimum","Use the essential first-step fields rather than requiring everything at once."],["Make incomplete visible","Incomplete enquiries remain actionable through follow-up tasks and clear status."],["Protect downstream work","Before booking, the app requests the required missing details instead of silently discarding them."]],"screens":["e01","e02","e03","e04","e05","e06","e07","e08","e09"],"stats":[["5–10 min → ~10 sec","Reported first-step enquiry capture"],["40% → 68%","Reported digital enquiry logging at this stage"],["27% → <5%","Reported late or missed enquiries"],["72% → 98%","Reported sales linked to a logged enquiry"]],"limits":"The source describes a quick first capture, with full completion later. Avoid presenting the 10-second figure as the time to complete the entire enquiry.","reflection":"Removing fields wasn't the whole solution. The difficult work was designing the system that makes 'later' reliable.","prev":"#tvs-research","next":"#tvs-quotes","nextLabel":"Quotations","previousLabel":"Research"},{"key":"tvs-quotes","name":"Digital Quotations","num":"04 / QUOTATIONS","role":"CASE STUDY 3","title":"The quotation book won because it worked.","summary":"We learned that handwritten quotes felt quick and negotiable. The new flow combined manager-controlled pricing, digital sharing, and a record customers and staff could return to.","intro":"The paper quotation book wasn't just a relic. It gave executives freedom to discuss offers and adjust to the dealership's pricing. Digital had to earn its place.","context":"Manual quotes could take five to seven minutes, were difficult to track, and could be lost. Fixed digital prices also conflicted with varied dealership offers and regional costs.","problem":"The job was to keep the flexibility of paper, while making the output accurate, shareable and retrievable.","people":"Branch managers needed control over variants, accessories, charges and discounts; sales executives needed speed; customers needed a quote they could understand and access.","approach":"The redesigned journey connects lead capture with quote generation, WhatsApp sharing, multiple vehicle options, manager-controlled price templates and a customer-facing portal.","decisions":[["Let the branch own the numbers","Managers configure quotation particulars and relevant price adjustments."],["Use WhatsApp as the handoff","Send a formatted quote into the channel customers already use."],["Keep a retrievable history","A quotation remains attached to the enquiry instead of disappearing with a paper sheet."]],"screens":["q01","q02","q03","q04","q05","q06","q07","q08","q09","q10","q11","q12"],"stats":[["5–7 min → <30 sec","Reported time to produce/share a quotation"],["90%","Reported customer quote-open rate"],["68% → 80%","Reported digital enquiry logging at this stage"]],"limits":"The prior case study reports these outcomes; the underlying analytics were not supplied here. Some screenshots depict customer self-registration and broader enquiry flows alongside the quotation work.","reflection":"Paper succeeded because it fit the sales moment. Digital won when it could do that and still make the outcome shareable and trackable.","prev":"#tvs-enquiry","next":"#kiosk","nextLabel":"Birth Certificate Kiosks","previousLabel":"Quick Enquiry"}]};
const files = Object.fromEntries(DB.screens.map(x=>[x.id,x]));
const stories = DB.cases;
const originalImages = Object.create(null);
const enc = x=>String(x).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
function panel(id, label){
 const p=files[id];if(!p)return "";
 const ratio=(p.w* (p.file.includes("hifi-2")||p.file.includes("quotes-3")?1411:1600))/
             (p.h* ({ "enq-hifi-1.jpg":4078,"enq-hifi-2.jpg":4096,"quotes-1.jpg":2887,"quotes-2.jpg":3766,"quotes-3.jpg":4096,"enq-ideation.jpg":1364,"tvs-banner.jpg":702 }[p.file]||1600));
 return '<div class="tv-panel" data-tv-crop="'+p.id+'" data-tv-layout="'+p.layout+'" role="img" aria-label="'+enc(label||p.title)+'" style="--tv-aspect:'+ratio.toFixed(7)+';aspect-ratio:'+ratio.toFixed(7)+'">'+
 '<canvas aria-hidden="true"></canvas><span class="tv-source-fallback">Loading original interface…</span></div>';
}
function visualFor(id,label){
 const target=files[id+"f"]?id+"f":id;
 const p=files[target];
 return '<figure class="tv-frame"><div class="tv-frame-main '+(id==="flow"?"is-paper":"")+'">'+panel(target,label)+'</div>'+
 '<figcaption><span>'+enc(p.title)+' · Original TVS interface</span><button type="button" data-tv-inspect="'+target+'">Enlarge screen ↗</button></figcaption></figure>';
}
function cards(items){
 return '<div class="tv-fact-grid">'+items.map((item,i)=>'<div><small>0'+(i+1)+'</small><strong>'+enc(item[0])+'</strong><p>'+enc(item[1])+'</p></div>').join("")+'</div>';
}
function metricVisual(c,limit=4){
 return '<div class="tv-metrics">'+c.stats.filter(x=>!x[0].startsWith("100%")).slice(0,limit).map(x=>'<div><strong>'+enc(x[0])+'</strong><span>'+enc(x[1])+'</span></div>').join("")+'</div><p class="tv-tiny-note">As reported in the original portfolio case study; underlying datasets not independently validated.</p>';
}
function quote(q,source){return '<div class="tv-quote"><blockquote>“'+enc(q)+'”</blockquote><cite>'+enc(source)+'</cite></div>';}
function flow(){
 return '<div class="tv-mini-flow"><div><b>01 · CAPTURE</b><p>Save essential information while the customer is present.</p></div><span aria-hidden="true">→</span><div><b>02 · COMPLETE</b><p>Return through follow-ups to finish necessary details.</p></div><span aria-hidden="true">→</span><div><b>03 · ACT</b><p>Book, share a quotation, and preserve a traceable record.</p></div></div>';
}
function storySlides(c){
 const s=[];
 const add=(part,heading,copy,content,annotation)=>s.push({part,heading,copy,content,annotation:annotation||""});
 if(c.key==="tvs"){
 add("ACT 01 / THE REALITY","The app was there. The team wasn't using it.","In a busy TVS dealership, staff chose paper over software. Not because they were resistant to technology, but because the software slowed a live sales conversation.",visualFor("e01f"),"Interface shown is the redesigned work; the opening describes the earlier workflow.");
 add("ACT 01 / THE REALITY","The workaround was the insight.","Enquiries were written on paper and often entered later. Handwritten quotes moved quickly, but managers could not consistently trace what happened.",cards([["DSEs","Stay engaged with the customer."],["Managers","See reliable enquiries, follow-ups and quotations."],["Dealer owners","Compare performance across locations."],["The constraint","Full records without a long form in front of a customer."]]));
 add("ACT 02 / THE WORK","We watched the showroom first.","Visits and interviews pointed to long forms, disconnected follow-ups, paper quotation books and gaps in reporting. That research set the order of work.",quote("If I take too long to enter details, they lose patience and walk away.","Sales executive · Original research notes"));
 add("ACT 02 / THE WORK","Capture now. Complete later.","Quick Enquiry cut the first interaction to the essentials, while follow-ups, reminders and booking gates protected data completeness.",visualFor("e02f"));
 add("ACT 02 / THE WORK","Make the quote worth keeping.","Managers could configure pricing; sales executives could generate and share quotes; customers could receive and retrieve them.",visualFor("q04f"));
 add("ACT 02 / THE WORK","One connected journey, not two features.","The enquiry establishes the lead. Later actions add the full record, quote the vehicle and move toward booking.",flow());
 add("ACT 03 / THE OUTCOME","The result went beyond speed.","The existing case study reports improvements in capture time, quotation speed, digital logging and sales traceability.",metricVisual(c));
 add("ACT 03 / REFLECTION","Designing for the showroom changed the solution.","A sales app only works when it understands the moment in which a salesperson uses it.",cards(c.decisions.slice(0,2)));
 }else if(c.key==="tvs-research"){
 add("ACT 01 / FIELDWORK","The best research tool was the showroom.","Watching actual customer conversations explained why staff avoided using the app at the point of sale.",visualFor("e01f"),"Shown: subsequent product direction, not a photograph of the research visit.");
 add("ACT 01 / FIELDWORK","Paper was protecting the conversation.","Customer-facing work made full data entry feel disruptive. The workaround was useful evidence, not behaviour to shame.",quote("We still use the TVS quotation book. It's just faster.","Sales executive · Original research notes"));
 add("ACT 02 / SYNTHESIS","Four things kept appearing.","Long forms, paper registers, delayed follow-ups and unreliable visibility were connected problems, not isolated UI defects.",cards([["Long forms","Customers could not wait through every field."],["Workarounds","Registers, Excel and quotation books stayed in use."],["Incomplete visibility","Managers did not see the full enquiry journey."],["Urgent sales work","Capture now; complete later."]]));
 add("ACT 02 / SYNTHESIS","The business needed the opposite of 'quick'.","Executives asked for speed; managers asked for complete and accurate data. We had to make both possible.",flow());
 add("ACT 02 / SYNTHESIS","We mapped dependencies before shipping.","Quick capture affected enquiry lists, status markers, tasks, follow-ups, notifications and booking. The ideation map recorded those relationships.",visualFor("flow"),"Original ideation flow; enlarge to inspect the full mapping.");
 add("ACT 03 / THE DECISIONS","Three bets made the roadmap.","Research led to Quick Enquiry, digital quotations and a digital delivery checklist, prioritised together with the business.",cards(c.decisions));
 add("ACT 03 / REFLECTION","Test with the real interruptions.","Two-week design cycles and showroom feedback helped validate the practicality of the solution.",visualFor("e02f"),"Shown: interface direction after the research phase.");
 }else if(c.key==="tvs-enquiry"){
 add("ACT 01 / THE FRICTION","A ten-minute form. A customer with ten minutes.","The old process demanded too much information while the executive was trying to sell.",visualFor("e01f"));
 add("ACT 01 / THE FRICTION","Make it fast without losing the lead.","A short capture must not create a dead end. The follow-up and booking journey had to stay connected.",flow());
 const steps=[
 ["Start an enquiry.","Give sales staff a direct action from the dashboard.","e01"],
 ["Capture the essentials.","The first step holds enough to register a lead without derailing the conversation.","e02"],
 ["Confirm it was saved.","The customer and interested vehicles stay associated with the enquiry.","e03"],
 ["Keep it findable.","The enquiry list and follow-up status make it actionable later.","e04"],
 ["Complete the remaining details.","At follow-up, add the information that was unnecessary during the first conversation.","e05"],
 ["Allow editing.","Users can update only the missing information or finish the full record.","e06"],
 ["Reflect the changes.","Details remain connected to one enquiry instead of becoming a second lead.","e07"],
 ["Protect the booking step.","Booking is gated until the required information is present.","e08"],
 ["Finish the necessary fields.","The workflow guides the executive through the final additional details.","e09"]
 ];
 steps.forEach((p,i)=>add("ACT 02 / THE SCREENS",String(i+1).padStart(2,"0")+" · "+p[0],p[1],visualFor(p[2])));
 add("ACT 03 / IMPACT","The first step became seconds, not minutes.","The reported ~10-second figure measures initial capture—not completion of every enquiry field.",metricVisual(c));
 }else{
 add("ACT 01 / THE PROBLEM","Paper won because it worked.","Dealerships still used quotation books. Flexibility, speed and negotiability mattered more than simply having a digital version.",cards([["Speed","Creating a quote could take five to seven minutes."],["Flexibility","Discounts and accessory charges vary."],["Trust","A handwritten quote could feel negotiable."],["Traceability","Paper quotations are easily lost."]]));
 const qs=[
 ["Capture interest, then quote.","A customer record begins the journey.","q01"],
 ["Let receptionists help.","Walk-in capture and assignment reduce lost leads.","q02"],
 ["Give customers a way in.","QR self-registration helps record interest.","q03"],
 ["Send a quotation on WhatsApp.","Share the estimate in a channel the customer already uses.","q04"],
 ["Keep a history.","Previously sent quotes remain available in the enquiry.","q05"],
 ["Support multiple vehicles.","Customers can compare variants without starting over.","q06"],
 ["Preview the actual numbers.","Edit particulars and generate a clear quote.","q07"],
 ["Give managers the controls.","Quotation settings live with the dealership.","q08"],
 ["Configure vehicle templates.","Set up quotations for models and variants.","q09"],
 ["Make room for local pricing.","Adjust costs, discounts and particulars.","q10"],
 ["Resend brochures and quotes.","Retrieval matters as much as initial sharing.","q11"],
 ["Let the customer return.","A portal provides access to enquiry and quotation records.","q12"]
 ];
 qs.forEach((p,i)=>add("ACT 02 / THE PRODUCT",String(i+1).padStart(2,"0")+" · "+p[0],p[1],visualFor(p[2])));
 add("ACT 03 / OUTCOME","Faster, shareable, retrievable.","The original case study reports under-30-second quotes, a 90% quote-open rate and growth in digital enquiry logging.",metricVisual(c));
 }
 const nextName=c.nextLabel;
 add("END / KEEP EXPLORING","The next story is waiting.",c.reflection,
 '<div class="tv-end-choices">'+
 '<a href="#'+c.key+'-detail">Read the full case study <span>↗</span></a>'+
 '<a href="'+c.next+'">Next / '+enc(nextName)+' <span>→</span></a>'+
 '<a href="'+c.prev+'">Previous / '+enc(c.previousLabel)+' <span>←</span></a>'+
 '<a href="#projects">All projects <span>↗</span></a></div>');
 return s;
}
function storyMarkup(c){
 const slides=storySlides(c), bars=slides.map(()=>"<i><b></b></i>").join("");
 const slideHtml=slides.map((x,i)=>'<section class="ab-slide tv-slide" data-bg="'+(["dark","blue","paper"][i%3])+'" aria-label="'+enc(c.name)+' slide '+(i+1)+'"><div class="tv-stage">'+
 '<div class="tv-story-copy" data-a><span class="tv-chapter">'+enc(x.part)+' <span>'+String(i+1).padStart(2,"0")+' / '+slides.length+'</span></span>'+
 '<h2>'+x.heading+'</h2><p>'+x.copy+'</p>'+
 (x.annotation?'<span class="tv-footnote">'+enc(x.annotation)+'</span>':'')+
 (i===0?'<span class="tv-story-hint">Tap right or use arrow keys to continue →</span>':'')+
 (i>0&&i<slides.length-1?'<a class="tv-story-deep" href="#'+c.key+'-detail">Explore the full case study ↗</a>':'')+
 '</div><div class="tv-story-visual" data-a>'+x.content+'</div></div></section>').join("\n");
 return '<div id="v-'+c.key+'" class="story-ov tv-overlay" hidden><div class="ab-deck tv-deck" tabindex="0" data-reel="'+c.key+'" data-dur="0" aria-roledescription="carousel" aria-label="'+enc(c.name)+' storyboard">'+
 '<div class="ab-bars" aria-hidden="true">'+bars+'</div>'+
 '<div class="ab-top"><div class="ab-who"><span class="tv-brand-mark">TVS</span><b>'+enc(c.name)+'</b><span>'+enc(c.role)+'</span></div>'+
 '<a class="tv-top-link" href="#'+c.key+'-detail">Detailed case study ↗</a><button class="ab-pause" type="button" hidden aria-label="Pause">❙❙</button>'+
 '<button class="ab-close" type="button" aria-label="Close story">✕</button></div>'+
 slideHtml+'<p class="ab-tip" aria-hidden="true">Tap sides / Arrow keys to navigate · Hold to pause · Drag down to close · Enlarge screens</p></div></div>';
}
function screenRow(id,i,mark){
 const p=files[id],target=files[id+"f"]?id+"f":id;
 const chosen=files[target];
 const extra=target!==id?'<details class="tv-detail-screen-more"><summary>View all screens in this step ↗</summary>'+
 '<p>Complete original product UI group for this step, displayed without the orange presentation heading or annotation column.</p>'+
 panel(id,p.title)+'<p><button type="button" data-tv-inspect="'+id+'">Enlarge the complete screen group ↗</button></p></details>':'';
 return '<article class="tv-screen-row"><div class="tv-screen-copy"><small>SCREEN / '+String(i+1).padStart(2,"0")+' · '+enc(mark)+'</small>'+
 '<h3>'+enc(p.title)+'</h3><p>'+enc(p.desc)+'</p></div>'+
 '<div class="tv-detail-screen-pair"><figure class="tv-detail-figure"><div class="tv-detail-figure-pad">'+panel(target,chosen.title)+'</div>'+
 '<figcaption><span>'+enc(chosen.title)+' · Actual UI</span><button type="button" data-tv-inspect="'+target+'">Inspect ↗</button></figcaption></figure>'+extra+'</div></article>';
}
function section(c,id,num,heading,content){
 return '<section class="tv-detail-section" id="'+c.key+'--'+id+'"><div class="tv-detail-section-title"><span class="tv-detail-index">'+num+' / '+id.toUpperCase()+'</span><h2>'+heading+'</h2></div><div class="tv-detail-body">'+content+'</div></section>';
}
function detailMarkup(c){
 const contentSections=[
 section(c,"context","01","The setting",'<p class="tv-detail-lead">'+enc(c.intro)+'</p><p>'+enc(c.context)+'</p><p>'+enc(c.problem)+'</p>'),
 section(c,"evidence","02","Who was affected and why",'<p class="tv-detail-lead">'+enc(c.people)+'</p>'+
 (c.key==="tvs-research"?quote("Customers are in a hurry. If I take too long to enter details, they lose patience and walk away.","Sales executive · Original project research"):'')+
 '<p>'+enc(c.approach)+'</p>'+
 (c.key==="tvs-research"?'<figure class="tv-detail-media">'+panel("flow","Original end-to-end enquiry ideation diagram")+'<figcaption>Enquiry flow, impacts and dependencies · Original work</figcaption></figure>':'')
 ),
 section(c,"decisions","03","What we decided",'<p class="tv-detail-lead">The decisions that moved the work forward, not just the screens that followed.</p>'+
 '<div class="tv-detail-cardset">'+c.decisions.map((x,i)=>'<div><small>0'+(i+1)+'</small><strong>'+enc(x[0])+'</strong><p>'+enc(x[1])+'</p></div>').join("")+'</div>'+
 (c.key==="tvs"||c.key==="tvs-enquiry"?'<div>'+flow()+'</div>':'')
 ),
 section(c,"screens","04","The screens, in context",'<p class="tv-detail-lead">'+(c.key==="tvs-research"?'These are the resulting product screens and the original impact map. They illustrate the design direction after research, not screenshots of research sessions.':c.key==="tvs"?'The product series is illustrated by selected enquiry and quotation screens. Open the three deep dives to inspect all their exported interface sequences.':'Every available high-fidelity panel from this case study is isolated from its old orange presentation layout. No product screens are regenerated.')+'</p>'+
 '<div class="tv-detail-stack">'+c.screens.map((id,i)=>screenRow(id,i,c.name)).join("")+'</div>'+
 '<p class="tv-detail-source-note">Product screens are isolated from their original design boards. Legacy presentation framing is intentionally excluded from the visible gallery.</p>'
 ),
 section(c,"impact","05","What the case study reports",'<p>'+enc(c.limits)+'</p><div class="tv-metrics" style="--ab-bg:#EDE9E0;--ab-acc:#2B3AFF;--ab-fg:#1A1A1A">'+c.stats.filter(x=>!x[0].startsWith("100%")).map(x=>'<div><strong>'+enc(x[0])+'</strong><span>'+enc(x[1])+'</span></div>').join("")+'</div>'+
 '<p class="tv-detail-source-note">Results reproduced from the project content in the existing portfolio. Supporting analytics and research datasets were not independently audited for this update.</p>'
 ),
 section(c,"reflection","06","What this taught me",'<p class="tv-detail-lead">'+enc(c.reflection)+'</p><p>The shared challenge across this series was to earn the users’ trust by meeting their actual workflow, not by demanding behaviour change for its own sake.</p>'+
 '<div class="tv-detail-next"><a href="#'+c.key+'">↺ Replay the storyboard</a><a href="'+c.prev+'">← Previous / '+enc(c.previousLabel)+'</a>'+
 '<a href="'+c.next+'">Next / '+enc(c.nextLabel)+' →</a><a href="#projects">All projects ↗</a></div>'
 )
 ];
 const anchorIds=["context","evidence","decisions","screens","impact","reflection"];
 return '<main id="v-'+c.key+'-detail" class="page tv-detail" hidden>'+
 '<div class="tv-detail-head"><a href="#'+c.key+'">← Storyboard</a><a href="#projects">All projects ↗</a></div>'+
 '<header class="tv-detail-hero"><div><p class="tv-eyebrow">TVS Motor · Extentia · '+enc(c.role)+'</p><p class="tv-detail-collab">Role: UX Designer on a team of four, working with product, engineering and dealership stakeholders.</p><h1>'+enc(c.title)+'</h1><p>'+enc(c.summary)+'</p></div>'+
 '<div class="tv-detail-hero-media">'+panel((id=>files[id+"f"]?id+"f":id)(c.screens.find(id=>id!=="flow")||"e02"),c.name+' source interface')+'</div></header>'+
 '<nav class="tv-detail-skip" aria-label="Case study sections"><span>JUMP TO</span>'+anchorIds.map(id=>'<button type="button" data-goto="'+c.key+'--'+id+'">'+id+'</button>').join("")+'</nav>'+
 contentSections.join("\n")+'</main>';
}
function addAll(){
 const slot=document.getElementById("tvs-case-root");if(!slot)return;
 slot.innerHTML=stories.map(c=>storyMarkup(c)+detailMarkup(c)).join("\n");
 const viewer=document.createElement("dialog");viewer.className="tv-inspector";viewer.id="tv-inspector";
 viewer.innerHTML='<header><span id="tv-inspector-title">TVS original screen</span><button type="button" data-tv-close>Close ✕</button></header>'+
 '<div class="tv-inspector-body"></div><footer><span>Actual TVS product interface · original proportions preserved</span><span>Close to return to the story</span></footer>';
 document.body.appendChild(viewer);
 document.addEventListener("click",ev=>{
  const b=ev.target.closest("[data-tv-inspect]");if(!b)return;
  ev.preventDefault();ev.stopPropagation();
  const id=b.getAttribute("data-tv-inspect"),p=files[id];if(!p)return;
  viewer.querySelector("#tv-inspector-title").textContent=p.title;
  viewer.querySelector(".tv-inspector-body").innerHTML=panel(id,p.title);
  
  renderPanels(viewer);
  if(!viewer.open)viewer.showModal();
 });
 viewer.querySelector("[data-tv-close]").addEventListener("click",()=>viewer.close());
 viewer.addEventListener("click",ev=>{if(ev.target===viewer)viewer.close();});
 window.addEventListener("hashchange",()=>{if(viewer.open)viewer.close();});
}
function renderPanels(root){
 (root||document).querySelectorAll(".tv-panel:not([data-tv-loaded])").forEach(el=>{
  el.dataset.tvLoaded="1";
  const p=files[el.dataset.tvCrop];if(!p)return;
  const canvas=el.querySelector("canvas"),img=originalImages[p.file]||(originalImages[p.file]=new Image());
  if(!img.src){img.decoding="async";img.src="img/"+p.file;}
  function draw(){
   if(!img.complete||!img.naturalWidth)return;
   const pixelW=Math.round(p.w*img.naturalWidth),pixelH=Math.round(p.h*img.naturalHeight);
   if(pixelW<=0||pixelH<=0)return;
   const maxW=1300, scale=Math.min(1,maxW/pixelW);
   canvas.width=Math.max(1,Math.round(pixelW*scale));canvas.height=Math.max(1,Math.round(pixelH*scale));
   el.style.setProperty("--tv-aspect",(canvas.width/canvas.height).toFixed(7)); el.style.aspectRatio=(canvas.width/canvas.height).toFixed(7);
   const context=canvas.getContext("2d",{alpha:false});
   if(!context)return;
   context.imageSmoothingEnabled=true;context.imageSmoothingQuality="high";
   const sx=Math.ceil(p.x*img.naturalWidth),sy=Math.ceil(p.y*img.naturalHeight);
   const ex=Math.floor((p.x+p.w)*img.naturalWidth),ey=Math.floor((p.y+p.h)*img.naturalHeight);
   context.fillStyle="#ffffff";context.fillRect(0,0,canvas.width,canvas.height);
   context.drawImage(img,sx,sy,Math.max(1,ex-sx),Math.max(1,ey-sy),0,0,canvas.width,canvas.height);
   el.classList.add("tv-ready");
  }
  img.addEventListener("error",()=>{const msg=el.querySelector(".tv-source-fallback");if(msg)msg.textContent="Unable to display this original screen";},{once:true});
  if(img.complete)draw();else img.addEventListener("load",draw,{once:true});
 });
}
addAll();
renderPanels(document);
})();

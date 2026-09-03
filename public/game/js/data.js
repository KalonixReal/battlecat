'use strict';
/* ============================== TRAITS & ABILITIES ============================== */
const TRAITS=['red','floating','black','metal','angel','alien','zombie','relic','aku','behemoth'];
const WALK_SPD=5; // engine px/s per raw wiki SPD point (preserves legacy Doge pacing, fixes relative speeds)
const TRAIT_COL={red:'#e0533f',floating:'#b07fd8',black:'#3a3a44',metal:'#9fb4c4',angel:'#f2d98a',alien:'#7fd8a8',zombie:'#8aa06a',relic:'#d8c37f',aku:'#c46adf',behemoth:'#6ad4c4',traitless:'#ffffff'};
const TRAIT_ICON={red:'R',floating:'F',black:'B',metal:'M',angel:'A',alien:'★',zombie:'Z',relic:'Ω',aku:'🜏',behemoth:'⚔',traitless:'T'};
const ABIL={kb:'Knockback',freeze:'Freeze',slow:'Slow',weaken:'Weaken',crit:'Critical',savage:'Savage Blow',wave:'Wave',surge:'Surge',toxic:'Toxic',dodge:'Dodge',warp:'Warp',curse:'Curse',barrierBreak:'Barrier Break',shieldPierce:'Shield Pierce',resist:'Resist',strengthen:'Strengthen',goodbye:'Goodbye',base:'Base Destroyer'};
// ability instance: {a:'freeze',p:0.3,d:2,vs:['red']}  p=probability d=duration/param vs=trait filter(null=all)

/* ============================== CAT DATA (canonical wiki values) ============================== */
const F=(n,hp,atk,rate,range,speed,kb,cost,cd,abil,area)=>({n,hp,atk,rate,range,speed,kb,cost,cd,abil:abil||[],area:!!area,g:0.06});
const CATS=[]; const CATMAP={};
function C(id,rarity,unlock,forms,tal){const c={id,rarity,unlock,forms,tal:tal||[],combo:[]};CATS.push(c);CATMAP[id]=c;return c}
const AB=(a,p,d,vs,extra)=>({a,p,d:d||0,vs:vs||null,extra});
// speeds stored as RAW wiki SPD stat (engine converts via WALK_SPD); range/cost/recharge = exact wiki values (cost = Ch.1 base)
C('cat','normal','start',[F('Cat',100,8,1.23,140,10,3,50,5),F('Macho Cat',100,8,1.23,140,10,3,50,5),F('Mohawk Cat',200,16,1.23,140,10,3,50,5)],[{n:'HP Up',np:8,e:{hp:.06}},{n:'Attack Up',np:8,e:{atk:.06}},{n:'Move Speed Up',np:5,e:{spd:.1}}]);
C('tank','normal','start',[F('Tank Cat',400,2,2.23,110,8,1,100,8,[],true),F('Wall Cat',400,2,2.23,110,8,1,100,8,[],true),F('Eraser Cat',600,4,2.23,110,8,1,100,8,[],true)],[{n:'HP Up',np:8,e:{hp:.06}},{n:'Knockback Chance',np:12,e:{kb:.12}},{n:'Move Speed Up',np:5,e:{spd:.1}}]);
C('axe','normal',{ch:'eoc1',st:2},[F('Axe Cat',150,34,2.19,110,14,3,150,2.6),F('Brave Cat',350,75,2.19,110,14,3,150,2.6),F('Dark Cat',650,150,2.19,110,14,3,250,2.6,[AB('weaken',.3,.5,null,.5)])]);
C('gross','normal',{ch:'eoc1',st:5},[F('Gross Cat',250,60,2.2,270,8,3,300,3.4),F('Cool Cat',550,130,2.2,270,8,3,300,3.4),F('Awesome Cat',1000,260,2.2,270,8,3,450,3.4)]);
C('cow','normal',{ch:'eoc1',st:8},[F('Cow Cat',90,12,0.53,110,30,3,610,3.2),F('Giraffe Cat',200,26,0.53,110,30,3,610,3.2),F('Ape Lord Cat',400,55,0.53,110,30,3,800,3.2)]);
C('bird','normal',{ch:'eoc1',st:12},[F('Bird Cat',110,45,2.2,350,10,3,260,4.2),F('Sky Cat',250,100,2.2,350,10,3,260,4.2),F('The Bird Cat',500,210,2.2,360,10,3,400,4.2)]);
C('fish','normal',{ch:'eoc1',st:16},[F('Fish Cat',450,90,1.87,110,9,3,290,3.5),F('Swordfish Cat',950,190,1.87,110,9,3,290,3.5),F('Poseidon Cat',1800,400,1.87,110,9,3,450,3.5)]);
C('lizard','normal',{ch:'eoc1',st:21},[F('Lizard Cat',500,130,2.7,400,5,4,700,5.2),F('Dragon Cat',1100,280,2.7,400,5,4,700,5.2),F('Cyberpunk Cat',2000,580,2.7,410,5,4,900,5.2)]);
C('titan','normal',{ch:'eoc1',st:26},[F('Titan Cat',600,60,2.53,110,4,1,480,4.6),F('Mythic Titan Cat',1300,130,2.53,110,4,1,480,4.6),F('Atlas Cat',2400,280,2.53,110,4,1,650,4.6)]);
C('boogie','normal',{ch:'eoc1',st:33},[F('Boogie Cat',80,8,0.63,110,17,3,35,1.8),F('Samba Cat',180,20,0.63,110,17,3,35,1.8),F('Carnival Cat',360,44,0.63,110,17,3,60,1.8)]);
C('mr','special','start',[F('Mr.',160,15,1.1,110,22,3,75,2.2),F('Super Mr.',380,36,1.1,110,22,3,75,2.2)]);
C('bahamut','special',{ch:'eoc3',st:48},[F('Bahamut Cat',1500,5000,20,450,6,3,3000,12,[AB('wave',1,1500)])]);
C('kungfu','special',{ch:'itf1',st:12},[F('Kung Fu Cat',600,120,1.4,110,14,3,200,3.4),F('Kung Fu Cat X',1400,300,1.4,110,14,3,300,3.4)]);
C('rock','special',{ch:'cotc1',st:10},[F('Rock Cat',1500,20,3.2,110,3,4,150,4,[AB('resist',1,0,['relic'])]),F('Boulder Cat',3400,45,3.2,110,3,4,200,4)]);
C('neko','rare',{gacha:'rare'},[F('Nekoluga',300,500,3.4,240,4,2,250,4.4),F('Tical-coluga',650,1100,3.4,250,4,2,300,4.4),F('Ultra Baa Coluga',1200,2300,3.4,260,4,2,400,4.4)]);
C('pogo','rare',{gacha:'rare'},[F('Pogo Cat',220,40,0.93,110,18,4,220,3.4,[AB('dodge',.2,0)]),F("Jiangshi Cat",500,90,0.93,110,18,4,220,3.4,[AB('dodge',.3,0)]),F('Bouncing Brush Cat',900,180,0.93,110,18,4,320,3.4,[AB('dodge',.4,0)])]);
C('sushi','rare',{gacha:'rare'},[F('Sushi Cat',900,30,2.9,110,6,4,300,4.6,[AB('resist',1,0,['red'])]),F('Sashimi Cat',2000,70,2.9,110,6,4,350,4.6,[AB('resist',1,0,['red'])])]);
C('cutter','rare',{gacha:'rare'},[F('Cutter Cat',350,150,2.2,110,14,2,200,3.6,[AB('savage',.08,3)]),F('Cruelty Cat',750,330,2.2,110,14,2,280,3.6,[AB('savage',.12,3)])]);
C('pirate','rare',{gacha:'rare'},[F('Pirate Cat',305,33,1.5,270,8,3,340,14.67,[AB('kb',.3,0,['red'])]),F('Captain Cat',350,43,1.5,270,8,3,340,14.67,[AB('kb',.3,0,['red'])]),F('Dread Pirate Catley',900,43,1.5,300,8,3,340,14.67,[AB('kb',.4,0,['red'])])]);
C('thief','rare',{gacha:'rare'},[F('Thief Cat',280,25,0.86,110,20,2,120,2.6,[AB('toxic',.1,.2)]),F('Ninja Cat',600,55,0.86,110,20,2,180,2.6,[AB('toxic',.15,.2)])]);
C('sorcerer','rare',{gacha:'rare'},[F('Witch Cat',400,90,2.4,260,8,3,420,4.8,[AB('slow',.4,2,['floating'])]),F('Sorcerer Cat',900,200,2.4,270,8,3,480,4.8,[AB('slow',.5,2.5,['floating'])])]);
C('guitar','rare',{gacha:'rare'},[F('Rocker Cat',300,70,1.2,180,11,3,300,3.8,[AB('wave',.15,40)]),F('Punk Cat',700,160,1.2,185,11,3,380,3.8,[AB('wave',.2,45)])]);
C('can','srar',{gacha:'srar'},[F('Hip Hop Cat',750,750,6.5,220,11,5,450,21.33,[AB('slow',.4,4,['red'])]),F('Dancing Flasher Cat',1500,1500,6.5,220,11,5,450,21.33,[AB('slow',.4,4,['red'])]),F('Can Can Cat',2250,2250,6.5,220,11,5,450,21.33,[AB('slow',.6,4,['red']),AB('immune',1,0,null,'warp')])]);
C('cyborg','rare',{gacha:'rare'},[F('Salon Cat',480,180,4.2,350,10,3,600,11,[],true),F('Paris Cat',580,250,4.2,350,10,3,600,11,[],true),F('Cyborg Cat',580,320,4.2,350,10,3,600,11,[AB('immune',1,0,null,'weaken')],true)]);
C('seafarer','srar',{gacha:'srar'},[F('Surfer Cat',950,460,3,270,12,4,660,28.67,[AB('freeze',.3,4,['alien']),AB('survive',.5,0)],true),F('Castaway Cat',1100,580,3,270,12,4,660,28.67,[AB('freeze',.3,4,['alien']),AB('survive',.5,0)],true),F('Seafarer Cat',1550,580,3,270,12,4,660,28.67,[AB('freeze',.4,4,['alien']),AB('survive',1,0)],true)]);
C('slime','rare',{gacha:'rare'},[F('Slime Cat',100,1500,9.07,140,15,1,300,21.33,[AB('wave',1,1132)]),F('Jellycat',100,1500,9.07,140,15,1,300,21.33,[AB('wave',1,1132)]),F('Jelly Dumpling Cat',100,1500,9.07,180,20,1,300,21.33,[AB('wave',1,1500)])]);
C('paladin','uber',{gacha:'uber'},[F('Marauder Cat',1300,200,5,195,7,3,1500,56.67,[AB('crit',.2,0)]),F('Berserker Cat',1800,300,5,195,7,3,1500,56.67,[AB('crit',.4,0)],true),F('Paladin Cat',2300,400,5,245,7,3,1500,56.67,[AB('crit',.5,0),AB('immune',1,0,null,'kb')],true)]);
C('medusa','rare',{gacha:'rare'},[F('Medusa Cat',570,120,3.3,350,8,3,500,16.67,[AB('freeze',.2,1.5,['relic'])],true),F('Twintail Medusa Cat',570,120,3.3,350,8,3,500,16.67,[AB('freeze',.2,1.5,['relic'])],true),F('Naga Cat',855,120,3.3,350,8,3,500,16.67,[AB('freeze',.3,2,['relic'])],true)]);
C('catman','uber',{gacha:'uber'},[F('Catman',5000,1500,2.9,340,8,4,700,6.4,[AB('kb',.4,0,['floating','alien']),AB('weaken',.5,.4,['floating','alien'],.5)]),F('Shadow Catman',11000,3300,2.9,350,8,4,800,6.4,[AB('kb',.5,0,['floating','alien']),AB('weaken',.6,.5,['floating','alien'],.5)])]);
C('mechabun','uber',{gacha:'uber'},[F('Mecha-Bun',9000,2400,4.4,110,16,3,800,7.2,[AB('savage',.3,4)]),F('Mecha-Bun MK3',19000,5200,4.4,110,16,3,900,7.2,[AB('savage',.4,4)])]);
C('noble','uber',{gacha:'uber'},[F('Warlord Cat',6500,1400,2.2,300,8,4,750,6.6,[AB('wave',.4,70),AB('freeze',.3,2,['black'])]),F('Demon King Cat',14000,3000,2.2,310,8,4,850,6.6,[AB('wave',.5,75),AB('freeze',.4,2.5,['black'])])]);
C('kaguya','uber',{gacha:'uber'},[F('Kaguya Cat',4200,900,1.6,260,10,4,680,6,[AB('kb',.3,0,['floating'])]),F('Lunar Kaguya Cat',9000,2000,1.6,270,10,4,760,6,[AB('kb',.4,0,['floating'])])]);
C('dioramos','uber',{gacha:'uber'},[F('Dioramos',8000,1800,3.8,450,5,4,850,7.4,[AB('wave',.8,80),AB('curse',.25,3,['relic','aku'])]),F('Overlord Dioramos',17000,3900,3.8,460,5,4,950,7.4,[AB('wave',.9,85),AB('curse',.35,3.5,['relic','aku'])])]);
C('gao','uber',{gacha:'uber'},[F('Gao',7000,2100,1.9,220,11,4,780,6.8,[AB('strengthen',1,1),AB('savage',.1,3)]),F('Death Gao',15000,4600,1.9,230,11,4,880,6.8,[AB('strengthen',1,1),AB('savage',.15,3)])]);
C('luza','legend',{gacha:'legend'},[F('Luza Cat',9000,2500,2.6,380,8,5,900,8,[AB('wave',1,90),AB('curse',.3,4),AB('surge',.4,140)])]);
C('gatr','legend',{gacha:'legend'},[F('Gatr',12000,3200,3.1,420,7,5,950,8.4,[AB('wave',1,95),AB('weaken',.5,.5,null,.4),AB('surge',.5,150)])]);
/* ---- Rare Capsule expansion (Island / Archer / Fortune / Jurassic) + Kotatsu (Super Rare) ---- */
C('island','rare',{gacha:'rare'},[F('Island Cat',1600,30,2.9,110,6,1,700,6.8,[AB('resist',1,0,['red'])],true),F('Island Cat MM',3400,65,2.9,110,6,1,850,6.8,[AB('resist',1,0,['red'])],true),F('Paradise Island Cat',6800,130,2.9,110,6,1,1100,6.8,[AB('resist',1,0,['red']),AB('kb',.3,0,['red'])],true)],[{n:'HP Up',np:8,e:{hp:.06}},{n:'Improve Red Resist',np:10,e:{hp:.08}}]);
C('archer','rare',{gacha:'rare'},[F('Archer Cats',350,85,1.7,420,8,4,300,4.2,[AB('weaken',.35,.5,['floating'])]),F('Ranger Cats',760,190,1.7,430,8,4,400,4.2,[AB('weaken',.5,.75,['floating'])])],[{n:'Attack Up',np:8,e:{atk:.06}},{n:'Move Speed Up',np:5,e:{spd:.1}}]);
C('fortune','rare',{gacha:'rare'},[F('Fortune Teller Cat',220,25,1.6,150,9,2,170,3.2,[AB('dodge',.25,0)]),F('Miss Fortune Cat',500,55,1.6,150,9,2,240,3.2,[AB('dodge',.4,0),AB('weaken',.3,.5)])],[{n:'HP Up',np:8,e:{hp:.06}},{n:'Dodge Chance',np:12,e:{hp:.05}}]);
C('jurassic','rare',{gacha:'rare'},[F('Jurassic Cat Sitter',420,120,2.9,150,16,3,330,4.2,[AB('crit',.15,0)],true),F('Jurassic Cat Sitter MM',920,260,2.9,160,16,3,430,4.2,[AB('crit',.25,0)],true)],[{n:'Attack Up',np:8,e:{atk:.06}},{n:'Crit Chance',np:12,e:{atk:.05}}]);
C('kotatsu','srar',{gacha:'srar'},[F('Kotatsu Cat',520,60,1.4,110,8,1,400,5.5,[AB('freeze',.25,1.5,['red'])],true),F('Hell Kotatsu Cat',1200,135,1.4,110,8,1,550,5.5,[AB('freeze',.4,2,['red'])],true)],[{n:'HP Up',np:8,e:{hp:.06}},{n:'Attack Up',np:8,e:{atk:.06}},{n:'Freeze Boost',np:14,e:{atk:.06}}]);
C('valkyrie','special',{ch:'itf1',st:48},[F('Valkyrie Cat',1200,300,1.8,180,14,3,1200,9,[],true),F('Divine Valkyrie',2200,560,1.8,180,14,3,1500,9,[AB('kb',.3,0)],true)]);
C('lilcat','special',{ch:'eoc1',st:48},[F("Li'l Cat",50,4,1.23,140,10,3,25,4)]);
C('liltank','special',{ch:'eoc2',st:48},[F("Li'l Tank Cat",200,1,2.23,110,8,1,50,6,[],true)]);
C('moneko','special',{rank:4},[F('Moneko',300,60,1.2,150,10,3,100,4)]);
C('neneko','special',{rank:12},[F('Neneko',500,40,0.9,160,12,3,150,6)]);

/* ============================== ENEMY DATA (canonical wiki values) ============================== */
// NOTE: all E() calls pass wiki order (rate, SPEED, RANGE, kb, money) — the two middle slots were
// historically declared swapped, which made every enemy run at 2-5× intended speed with a ~9px
// attack reach (they traffic-jammed at the base and never struck it). Signature now matches the data.
const EF=(n,tr,hp,atk,rate,speed,range,kb,money,abil,o)=>Object.assign({n,tr:tr||[],hp,atk,rate,range,speed,kb,money,abil:abil||[],boss:false},o||{});
const ENEMIES=[];const ENEMAP={};
function E(id,def){def.id=id;ENEMIES.push(def);ENEMAP[id]=def;return def}
E('doge',EF('Doge',[],90,8,1.6,9,45,3,15));
E('snache',EF('Snache',[],100,15,1.2,14,72,3,30));
E('those',EF('Those Guys',[],200,20,1.0,18,90,1,75));
E('baa',EF('Baa Baa',[],500,50,1.8,13,63,3,150));
E('jackie',EF('Jackie Peng',[],1300,80,0.8,20,99,3,450));
E('leboin',EF("Le'boin",[],4000,654,6.2,7,36,1,1300));
E('hippoe',EF('Hippoe',[],1000,100,2.2,7,36,1,400,[],{boss:true}));
E('sirseal',EF('Sir Seal',[],2500,150,0.8,18,90,1,650,[AB('slow',.3,2)],{boss:true}));
E('dudorian',EF('Dudorian the Dumpling',[],900,110,1.9,16,80,3,120));
E('onehorn',EF('One Horn',['red'],15000,500,0.5,5,27,1,2500,[],{boss:true}));
E('teacher',EF('Teacher Bear',[],3000,1000,3.6,7,36,10,2000,[],{boss:true}));
E('croco',EF('Croco',[],70,30,0.6,25,126,1,50));
E('shibalien',EF('Shibalien',['alien'],1000,80,1.6,12,58,3,80,[AB('warp',.15,2)]));
E('darkotius',EF('Dark Otius',['black'],2200,300,2.6,11,55,2,180,[AB('kb',.3,0)],{boss:true}));
E('face',EF('The Face',[],99999,2000,9.1,2,9,2,4000,[AB('wave',.6,70)],{boss:true}));
E('nyandam',EF('Lord Nyandam',['red'],8888,888,2.8,7,36,3,999,[AB('kb',.4,0)],{boss:true}));
E('redfox',EF('Red Fox',['red'],1800,150,1.8,17,85,2,140,[AB('kb',.25,0)]));
E('ghostdoge',EF('Ghost Doge',['floating'],400,40,1.4,15,75,3,45,[AB('dodge',.3,0)]));
E('angelgabriel',EF('Gabriel',['angel'],1200,120,1.7,19,95,3,110,[AB('dodge',.2,0)]));
E('angelseraph',EF('Seraph',['angel'],3500,260,2.4,14,70,2,240,[AB('kb',.3,0)],{boss:true}));
E('metallic',EF('Metal Hippoe',['metal'],80,200,0.6,7,36,2,400,[],{boss:true}));
E('metallicdoge',EF('Metal Doge',['metal'],1,8,1.6,9,45,3,60));
E('zombieelephant',EF('Zombie Elephant',['zombie'],1500,140,2.5,10,50,3,160,[AB('kb',.3,0)]));
E('zombierturtle',EF('Zombie Turtle',['zombie'],2500,100,3.2,6,30,4,200,[],{revive:{n:1,pct:.6}}));
E('zombibear',EF('Zombie Bear',['zombie'],3000,220,2.8,8,40,2,260,[],{revive:{n:1,pct:.5},burrow:{d:220},boss:true}));
E('relicdoge',EF('Relic Doge',['relic'],2200,180,1.9,14,70,3,150,[AB('curse',.2,2)]));
E('relichippo',EF('Ancient Hippoe',['relic'],6000,400,3.0,5,25,1,380,[AB('curse',.3,2.5)],{boss:true}));
E('akudoge',EF('Aku Doge',['aku'],3000,200,1.7,13,65,3,180,[],{shield:{hp:900}}));
E('akucerberus',EF('Aku Cerberus',['aku'],5000,320,2.2,11,55,2,300,[AB('surge',.4,130)],{shield:{hp:1500},boss:true}));
E('akumother',EF('Almighty Aku',['aku'],16000,500,3.2,4,18,4,800,[AB('surge',.7,150),AB('curse',.4,3)],{shield:{hp:4000},boss:true}));
E('akuhound',EF('Aku Hound',['aku'],4200,280,1.9,17,85,3,240,[AB('dodge',.25,0)],{shield:{hp:1200}}));
E('behemothcroc',EF('Beast Croc',['behemoth'],8000,350,2.6,11,55,3,400,[AB('weaken',.3,.4,null,.6)],{boss:true}));
E('behemothbear',EF('Beast Bear',['behemoth'],14000,550,3.4,6,28,2,550,[AB('kb',.3,0)],{boss:true}));
E('witchen',EF('Witchen',['floating'],1600,160,1.8,12,60,3,150,[AB('weaken',.3,.4,null,.5)]));
E('snacheboss',EF('Snache the Devourer',['black'],6000,300,1.2,16,80,2,350,[AB('crit',.15,3)],{boss:true}));
E('clionel',EF('Clionel',['floating'],5000,420,2.9,9,45,3,350,[AB('surge',.5,140)],{boss:true}));
E('dogedark',EF('Dogeluge',['black'],2600,240,2.0,15,75,3,170,[AB('wave',.25,50)]));
E('divadoge',EF('Diva Doge',[],2400,180,1.5,14,70,3,160,[AB('kb',.2,0)]));
E('titanice',EF('Titanice',['alien'],9000,380,3.4,5,25,2,450,[AB('freeze',.3,2)],{boss:true}));
E('cosmicdoge',EF('Cosmic Doge',['alien'],1800,160,1.8,16,80,3,140,[AB('warp',.2,2.5)]));
E('staralien',EF('Star Alien',['alien'],4000,300,2.4,10,50,3,300,[AB('kb',.35,0),AB('warp',.2,2)],{boss:true}));
E('grizzlynuke',EF('Grizzly Nuke',['behemoth'],11000,600,3.8,6,30,2,600,[AB('wave',.5,80),AB('toxic',.2,.25)],{boss:true}));
E('akuhound2',EF('Infernal Hound',['aku'],4200,280,1.9,17,85,3,240,[AB('dodge',.25,0)],{shield:{hp:1200}}));
/* ---- expanded canon roster: EoC / ItF / CotC ---- */
E('gory',EF('Gory',[],1200,150,0.9,16,80,3,500));
E('wanwan',EF('Wanwan',[],1600,60,2.6,5,20,4,200,[],{boss:false}));
E('owlbrow',EF('Owlbrow',['floating'],1800,220,2.1,10,50,2,300,[AB('slow',.25,2)]));
E('camelle',EF('Camelle',[],5500,280,4.5,4,20,1,900));
E('mastera',EF('Master A.',[],9000,900,2.8,6,30,2,2200,[],{boss:true}));
E('bore',EF('Bore',['red'],13000,1200,1.2,20,100,2,3000,[],{boss:true}));
E('kurosawah',EF('Kurosawah',[],8000,1500,3.0,5,22,1,2600,[AB('kb',.3,0)],{boss:true}));
E('gregor',EF('General Gregor',['alien'],5000,400,2.2,10,50,3,1400,[AB('warp',.2,2)],{boss:true}));
E('lesolar',EF('LeSolar',['alien'],1600,200,1.9,15,75,3,240));
E('spacefish',EF('Spacefish Jones',['alien','floating'],2600,300,2.4,9,45,2,420,[AB('kb',.25,0)],{boss:true}));
E('projecta',EF('Project A',['alien'],12000,1100,2.6,7,35,2,2800,[AB('freeze',.2,1.5)],{boss:true}));
E('phace',EF('I.M. Phace',['alien'],7000,700,2.0,8,40,3,1800,[AB('weaken',.3,.5,null,.5)],{boss:true}));
E('dober',EF('Dober',['alien'],20000,2000,1.6,16,80,2,4500,[],{boss:true}));
E('sael',EF('Imperator Sael',['alien'],30000,2500,3.6,12,60,4,6000,[AB('warp',.3,2.5)],{boss:true}));
E('elizabeth',EF('Elizabeth the 1st',['floating'],6000,500,2.6,8,40,3,1600,[AB('weaken',.5,.6,null,.5)],{boss:true}));
E('sunfish',EF('Sunfish Jones',['alien'],9000,800,2.2,6,30,2,2600,[AB('freeze',.25,2)],{boss:true}));
E('celeboodle',EF('Celeboodle',['alien'],2200,180,1.2,14,70,3,260));
/* ============================== CONTENT: CHAPTERS / STAGES ============================== */
const COUNTRY=["Korea","Japan","China","Taiwan","Mongolia","Philippines","Vietnam","Thailand","Malaysia","Singapore","Indonesia","India","Sri Lanka","Pakistan","Nepal","Bangladesh","Myanmar","Cambodia","Laos","Kazakhstan","Russia","Ukraine","Turkey","Egypt","Saudi Arabia","Iran","Iraq","Israel","Greece","Italy","Spain","Portugal","France","Germany","Poland","Norway","Sweden","Finland","UK","Ireland","Iceland","Greenland","Canada","USA","Mexico","Cuba","Brazil","Argentina"];
const FUT=["Neo Tokyo","Cyber Seoul","Mecha Osaka","Grid Shanghai","Hologon Kong","Circuit Bangkok","Neon Delhi","Chrome Mumbai","Steel Ankara","Laser Cairo","Turbo Athens","Ion Rome","Nexus Madrid","Pulse Lisbon","Quantum Paris","Reactor Berlin","Cryo Warsaw","Aurora Oslo","Bion Sweden","Nano Riga","Fusion Dublin","Volt Reykjavik","Dynamo Ottawa","Plasma D.C.","Radar Austin","Photon Denver","Servo Vegas","Matrix Salem","Helix Honolulu","Drone Anchorage","Ozone Lima","Astro Bogota","Vector Sao Paulo","Robo Buenos","Zephyr Santiago","Quark Caracas","Echo Havana","Tesla Kingston","Orbit Panama","Static Quito","Catalyst La Paz","Flux Asuncion","Delta Montevideo","Synth Paramaribo","Cobalt Georgetown","Prism Bridgetown","Krypton Nassau","Nova Willemstad"];
const COSMOS=["Lunar Far Side","Mare Tranquillitatis","Copernicus Rim","Kepler Base","Vega Prime","Orion Belt","Andromeda Gate","Titan Dunes","Europa Fissures","Io Cauldron","Ganymede Fields","Callisto Vault","Saturn Rings","Enceladus Geysers","Uranus Drift","Neptune Storm","Pluto Outpost","Eris Silence","Ceres Hollow","Vesta Spire","Pallas Wastes","Juno Fringe","Alpha Centauri","Proxima Vale","Barnard Reach","Wolf Steppe","Lalande Basin","Sirius Beacon","Altair Skyway","Deneb Gate","Rigel Foundry","Betelgeuse Ash","Antares Pit","Spica Lattice","Arcturus Span","Pollux Yard","Castel Gemini","Capella Terraces","Aldebaran Forge","Regulus Court","Polaris Crown","Mizar Bridge","Alcor Spires","Alioth Rampart","Megrez Chain","Phecda Keep","Merak Ford","Dubhe Throne"];
const CHAPTERS=[];const CHMAP={};
function CH(id,n,kind,names,tier,opts){const c=Object.assign({id,n,kind,names,tier,stages:[],bossAt:[4,11,19,29,39,47]},opts||{});CHAPTERS.push(c);CHMAP[id]=c;return c}
const EOCP=['doge','snache','those','baa','jackie','leboin','dudorian','hippoe','sirseal','onehorn','teacher','face','nyandam','redfox','gory','wanwan','owlbrow','camelle'];
const ITFP=['doge','snache','those','baa','jackie','croco','ghostdoge','witchen','shibalien','hippoe','sirseal','darkotius','teacher','metallic','metallicdoge','divadoge','face','lesolar','elizabeth','celeboodle'];
const COTCP=['doge','snache','croco','shibalien','cosmicdoge','ghostdoge','witchen','jackie','metallic','titanice','staralien','divadoge','darkotius','celeboodle'];
const SOLP=['doge','snache','those','baa','jackie','croco','dudorian','leboin','redfox','angelgabriel','zombieelephant','relicdoge','metallicdoge','ghostdoge','hippoe','sirseal','dogedark','onehorn'];
const ULP=['zombibear','relichippo','behemothcroc','behemothbear','akuhound','akucerberus','clionel','grizzlynuke','angelseraph','snacheboss','face'];
const AKUP=['akudoge','akuhound','zombieelephant','relicdoge','akucerberus','zombierturtle','behemothcroc','akumother'];
CH('eoc1','Empire of Cats: Ch.1','story',COUNTRY,1,{pool:EOCP,energy:10,bg:'grass',bgm:'eoc',treasure:true,desc:'Lord Nyandam invades the world of the Cats!'});
CH('eoc2','Empire of Cats: Ch.2','story',COUNTRY,2,{pool:EOCP,energy:12,bg:'desert',bgm:'eoc2',treasure:true,mag:1.6,desc:'The battle intensifies. Enemies grow stronger!'});
CH('eoc3','Empire of Cats: Ch.3','story',COUNTRY,3,{pool:EOCP,energy:14,bg:'snow',bgm:'eoc3',treasure:true,mag:2.6,desc:'The final Empire of Cats campaign!'});
CH('itf1','Into the Future: Ch.1','story',FUT,4,{pool:ITFP,energy:16,bg:'future',bgm:'itf',treasure:true,mag:2.2,alien:true,desc:'The Cats travel to a ruined future.'});
CH('itf2','Into the Future: Ch.2','story',FUT,5,{pool:ITFP,energy:18,bg:'future',bgm:'itf2',treasure:true,mag:3.4,alien:true,desc:'The future timeline darkens further.'});
CH('itf3','Into the Future: Ch.3','story',FUT,6,{pool:ITFP,energy:20,bg:'future',bgm:'itf3',treasure:true,mag:5,alien:true,desc:'Face the future final bosses!'});
CH('cotc1','Cats of the Cosmos: Ch.1','story',COSMOS,7,{pool:COTCP,energy:22,bg:'cosmos',bgm:'cotc',treasure:true,mag:4.5,alien:true,desc:'The Cats take the war to outer space.'});
CH('cotc2','Cats of the Cosmos: Ch.2','story',COSMOS,8,{pool:COTCP,energy:24,bg:'cosmos',bgm:'cotc2',treasure:true,mag:6.5,alien:true,desc:'Deeper into the cosmos.'});
CH('cotc3','Cats of the Cosmos: Ch.3','story',COSMOS,9,{pool:COTCP,energy:26,bg:'cosmos',bgm:'cotc3',treasure:true,mag:9,alien:true,desc:'The ultimate cosmic campaign.'});
CH('sol','Stories of Legend','sol',[],10,{energy:20,bg:'grass',bgm:'sol',desc:'Endless sub-chapter challenges.'});
CH('ul','Uncanny Legends','ul',[],11,{energy:26,bg:'snow',bgm:'ul',desc:'Legends of dread await.'});
CH('aku','Aku Realms','aku',[],12,{energy:24,bg:'aku',bgm:'aku',desc:'The realm of the Aku. Shields and surges.'});
CH('dojo','Catclaw Dojo','dojo',[],13,{energy:8,bg:'dojo',bgm:'dojo',desc:'Prove your strength. Endless grading.'});
CH('event','Event Stages','event',[],14,{energy:15,bg:'event',bgm:'event',desc:'Daily & weekly rotating rewards.'});
const SOL_SUBS=[],UL_SUBS=[];
(function(){
  const A=['Legend of the','Tale of the','Ballad of the','Revenge of the','Shadow of the','Return of the','Curse of the','Song of the','Dawn of the','Wrath of the','Trials of the','March of the'];
  const B=['Hollow Cat','Iron Doge','Crimson Sea','Silent Bog','Starving Wolf','Golden Crow','Whispering Dunes','Frozen Fang','Broken Shrine','Gilded Serpent','Midnight Circus','Rusted Legion','Crimson Moon','Howling Vale','Cinder Coast','Jade Temple','Onyx Mesa','Wailing Coast','Amber Wastes','Bleak Steppe','Ox/cart Ferry','Twilight Keep','Salt Marsh','Old Capital','Red Ledger','Nine Tails','Paper Lantern','Ghost Lantern','Mud Throne','Last Ember'];
  const r=rnd(777);
  for(let i=0;i<30;i++){const n=pick(A,r)+' '+pick(B,r);SOL_SUBS.push({id:'sol'+i,n,idx:i,pool:SOLP.slice(0,Math.min(SOLP.length,8+Math.floor(i/3))),mag:2+i*0.55,energy:20+Math.floor(i/2)})}
  for(let i=0;i<10;i++){const n='Uncanny: '+pick(B,r);UL_SUBS.push({id:'ul'+i,n,idx:i,pool:ULP,mag:9+i*1.6,energy:26+i})}
})();
const AKU_GATES=[];for(let i=1;i<=13;i++)AKU_GATES.push({id:'aku'+i,n:'Aku Gate '+i,idx:i-1,pool:AKUP,mag:4+i*1.3,energy:24,final:i===13});
const DOJO_STAGES=[];for(let i=1;i<=15;i++)DOJO_STAGES.push({id:'dojo'+i,n:'Dojo Exam '+i,idx:i-1,pool:['doge','snache','those','baa','jackie','croco','hippoe','sirseal','teacher','face','onehorn'],mag:1+i*1.1,energy:8,endless:i===15});
// ---- treasure sets ----
const TSTATS={atk:'Cat Attack Up',hp:'Cat Health Up',wallet:'Wallet Size Up',cannon:'Cannon Charge Up',baseHp:'Cat Base Health Up',worker:'Worker Efficiency Up',xp:'XP Gain Up',energy:'Energy Recovery Up',speed:'Research Speed Up',crit:'Critical Rate Up'};
const CHSETS={};
(function(){const mk=id=>{const c=CHMAP[id];const S=[];const nouns=['Idol','Crown','Totem','Sigil','Prism','Relic','Mask','Orb','Talisman'];const shortN=c.n.split(':')[0].replace('Empire of Cats','Empire').replace('Into the Future','Future').replace('Cats of the Cosmos','Cosmos');const stats=Object.keys(TSTATS);for(let i=0;i<9;i++){const st=stats[(i+(c.tier||1))%stats.length];S.push({n:nouns[i]+' of '+shortN,stat:st})}return S};
  CHSETS.eoc1=mk('eoc1');CHSETS.eoc2=mk('eoc2');CHSETS.eoc3=mk('eoc3');CHSETS.itf1=mk('itf1');CHSETS.itf2=mk('itf2');CHSETS.itf3=mk('itf3');CHSETS.cotc1=mk('cotc1');CHSETS.cotc2=mk('cotc2');CHSETS.cotc3=mk('cotc3')})();
function tCount(ch,setIdx){const t=SV.treasures[ch];if(!t)return 0;const v=t[setIdx];return v===undefined?0:v} // 0..3 tiers owned (cumulative)
function treasureMult(stat){let m=1;for(const ch in CHSETS){const sets=CHSETS[ch];for(let i=0;i<sets.length;i++){if(sets[i].stat===stat){m*=1+0.055*tCount(ch,i)}}}return m}
// treasure drop chance — scales up with stage progress (later stages drop more often, like the original's farming loop)
function treasureChance(ch,idx,own){const base=[0.65,0.4,0.28][own]||0.28;const c=CHMAP[ch];let frac=0.4;
  if(c&&c.kind==='story')frac=Math.min(1,(idx||0)/47);else if(c&&(c.kind==='sol'||c.kind==='ul'))frac=((idx||0)%8)/7;
  return Math.min(0.95,base*(0.7+0.6*frac))}
const FRUIT_NAMES={red:'Red Catfruit',green:'Green Catfruit',yellow:'Yellow Catfruit',blue:'Blue Catfruit',purple:'Purple Catfruit',epic:'Epic Catfruit',ancient:'Ancient Fruit'};
const FRUIT_COL={red:'#e0604f',green:'#6fd06f',yellow:'#ffd94a',blue:'#5fa8e8',purple:'#b07fd8',epic:'#ff8ad8',ancient:'#d8c37f'};
// ---- stage generation ----
const stageCache={};
function bossFor(ch,idx,R){const c=CHMAP[ch];if(c.kind==='sol'||c.kind==='ul')return idx===7?pick(c._lastBoss||(c._lastBoss=ULP.concat(['face'])),R):null;
  if(!c.bossAt.includes(idx))return null;
  const t=c.tier;const tk=c.kind==='story'?(ch.startsWith('itf')?'itf':ch.startsWith('cotc')?'cotc':'eoc'):c.kind;
  const table={eoc:['hippoe','sirseal','mastera','onehorn','nyandam','face'],itf:['gregor','darkotius','phace','projecta','dober','sael'],cotc:['darkotius','sunfish','titanice','grizzlynuke','behemothbear','face'],aku:['akucerberus','akumother'],dojo:['hippoe','sirseal','onehorn','teacher','face','snacheboss'],event:['hippoe','sirseal','onehorn','face'],sol:['kurosawah','bore','onehorn','face'],ul:['relichippo','behemothbear','akumother','face']}[tk]||['hippoe'];
  return table[Math.min(table.length-1,Math.floor(c.bossAt.indexOf(idx)/Math.max(1,table.length-1)*(t<10?table.length-1:table.length-1)))]}
function genStage(ch,idx){
  const key=ch+':'+idx;if(stageCache[key])return stageCache[key];
  const c=CHMAP[ch];const R=rnd((ch.length*7919+idx*104729+13)>>>0);
  const st={ch,idx,name:'',energy:c.kind==='story'?Math.min(30,5+Math.floor(idx*0.35)):c.energy,baseHp:0,catBaseHp:Math.round(1200*treasureMult('baseHp')),bg:c.bg||'grass',bgm:c.bgm||'eoc',script:[],trigger:null,boss:null,reward:{},mag:{hp:1,atk:1}};
  if(c.kind==='story'){st.name=c.names[idx%48];st.mag.hp=(c.mag||1)*(1+idx*0.06);st.mag.atk=(c.mag||1)*(1+idx*0.045)}
  else if(c.kind==='sol'||c.kind==='ul'){const sub=c.kind==='sol'?SOL_SUBS[Math.floor(idx/8)]:UL_SUBS[Math.floor(idx/8)];const i2=idx%8;st.name=sub.n+' — '+['Stage 1','Stage 2','Stage 3','Stage 4','Stage 5','Stage 6','Stage 7','BOSS'][i2];st.mag.hp=sub.mag*(1+i2*0.35);st.mag.atk=sub.mag*(1+i2*0.22);st.pool=sub.pool;st.energy=sub.energy}
  else if(c.kind==='aku'){st.name=AKU_GATES[idx].n;st.mag.hp=AKU_GATES[idx].mag;st.mag.atk=AKU_GATES[idx].mag*0.8;st.pool=AKU_GATES[idx].pool;st.shieldHeavy=true}
  else if(c.kind==='dojo'){const d=DOJO_STAGES[idx];st.name=d.n;st.mag.hp=d.mag;st.mag.atk=d.mag*0.7;st.pool=d.pool;st.endless=d.endless}
  else if(c.kind==='event'){st.name=st._eventName||'';st.mag.hp=st._mag||1;st.mag.atk=st._mag||1;st.pool=st._pool||EOCP}
  const pool=st.pool||c.pool.filter((p,i)=>i<=Math.min(c.pool.length-1,Math.floor(idx/48*c.pool.length)));
  st.baseHp=Math.round((c.kind==='story'?900+idx*260:1400)*st.mag.hp*(c.kind==='story'&&idx===47?3:1));
  if(st.endless){st.baseHp=Math.round(3000*st.mag.hp)}
  // waves — pressure ramps with stage index (early tutorial stays gentle, mid-chapter demands production)
  const waves=[];const nW=st.endless?999:(5+Math.floor(R()*4)+Math.floor(idx/9));
  let t=3.5;const fast=pool.filter(p=>ENEMAP[p]&&!ENEMAP[p].boss);
  for(let w=0;w<Math.min(nW,16);w++){
    const spawns=[];const kinds=1+Math.floor(R()*2)+(idx>14?1:0);const budget=(90+idx*22+w*60)*(c.tier>=4?1.5:1);
    const cap=3+Math.ceil(idx/10); // per-kind count cap grows 3 -> 8
    for(let k=0;k<kinds;k++){const e=pick(fast,R);const ed=ENEMAP[e];if(!ed)continue;const per=Math.max(1,Math.round(budget/ed.hp/(2+R()*2)));if(per<1)continue;
      spawns.push({e,count:Math.min(per,ed.tr.includes('metal')?2:cap),interval:0.5+R()*1.2})}
    if(spawns.length){waves.push({t,spawns});t+=(idx>10?4.5+R()*5:5.5+R()*6.5)-(idx>20?1.5:0)}
  }
  // peon trickle between waves (sustained pressure from stage 3+)
  if(!st.endless&&idx>=3&&waves.length>=2&&fast.length){
    for(let g=1;g<waves.length;g++){const gap=waves[g].t-waves[g-1].t;
      if(gap>7&&R()<0.8){const e=pick(fast,R);waves.splice(g,0,{t:waves[g-1].t+gap*(0.45+R()*0.2),spawns:[{e,count:1+Math.floor(R()*2),interval:0.8}]})}}
  }
  st.script=waves;
  const b=bossFor(ch,idx,R);
  if(b){const bd=ENEMAP[b];st.boss=b;
    const trigger={onBase:idx===47||st.mag.hp>8?0.98:0.5,spawn:[{e:b,count:1,interval:0}],warn:'⚠ '+bd.n.toUpperCase()+' APPEARS!'};
    st.trigger=trigger;st.shockwave=!!bd.boss&&bd.hp>=2000;}
  st.reward={xp:Math.round((70+idx*45)*(1+(c.tier||1)*0.5)),fruit:fruitDrop(c,idx,R),cf:0,ticket:(c.kind==='event'&&st._ticket)||0};
  if(c.kind==='story'&&idx===47)st.reward.cf=30;
  if(c.kind==='sol')st.reward.xp=Math.round(st.reward.xp*1.3);
  if(c.kind==='ul')st.reward.xp=Math.round(st.reward.xp*1.8);
  stageCache[key]=st;return st;
}
function fruitDrop(c,idx,R){if(!c||!c.tier)return null;const r=R();const table={1:[['red',.10],['green',.08]],2:[['green',.10],['yellow',.08]],3:[['yellow',.10],['blue',.08],['purple',.04]],4:[['blue',.10],['purple',.06]],5:[['blue',.10],['purple',.07]],6:[['purple',.10],['epic',.05]],7:[['purple',.10],['epic',.06]],8:[['epic',.08],['ancient',.03]],9:[['epic',.09],['ancient',.04]]};
  const t=table[Math.min(9,c.tier)]||table[1];for(const[f,p]of t)if(r<p)return f;return null}
function eventStages(){
  const d=new Date();const key=d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate();const wd=d.getDay();const R=rnd(d.getFullYear()*372+wd*97);
  const list=[];const mkEv=(n,desc,pool,mag,energy,xp,fruit,ticket)=>{
    // clone the shared event:0 template — sharing the cached object made every event identical (name/rewards/pool/mag of the last entry)
    const base=genStage('event',0);const s=Object.assign({},base);
    s.mag={hp:mag,atk:mag};s.pool=pool.slice();s.baseHp=Math.round(1400*mag);
    s.name=n;s.energy=energy;s.reward={xp,fruit,cf:0,ticket};s.ch='event';s.idx=-1;
    s.evtId=key+'_'+n; // per-day identity → per-day first-clear/rewards + cleared badges
    list.push({s,desc,key:wd+n})};
  mkEv('XP Colosseum','Massive XP reward!',['baa','those','jackie','hippoe'],2+wd,20,5000+wd*1200,null,0);
  mkEv('Catfruit Field','Guaranteed Catfruit drop!',['doge','snache','baa','hippoe'],1.5,25,400,['red','green','yellow','blue','purple'][wd%5],0);
  mkEv('Ticket Box','Chance at Rare Tickets!',['croco','ghostdoge','witchen','sirseal'],2.2,30,800,null,wd%2===0?1:0.5);
  if(wd===0||wd===6){mkEv('Weekend Legend: The Face Returns','Weekly legend stage!',['face','baa','doge','hippoe'],14,60,15000,'purple',1)}
  mkEv('Behemoth Hunt','Uncanny mini-boss!',['behemothcroc','doge','snache'],6,45,8000,'epic',0);
  return list}
function chapterUnlocked(id){
  const c=CHMAP[id];const cleared=(ch,st)=>{const cc=SV.cleared[ch];return cc&&cc[String(st)]};
  switch(id){case 'eoc1':case 'event':return true;case 'eoc2':return cleared('eoc1',47);case 'eoc3':return cleared('eoc2',47);
    case 'itf1':return cleared('eoc3',47);case 'itf2':return cleared('itf1',47);case 'itf3':return cleared('itf2',47);
    case 'cotc1':return cleared('itf3',47);case 'cotc2':return cleared('cotc1',47);case 'cotc3':return cleared('cotc2',47);
    case 'dojo':return cleared('eoc2',47);case 'aku':return cleared('itf3',47);
    case 'sol':return cleared('eoc1',47);case 'ul':return Object.keys(SV.cleared.sol||{}).length>=20;
    default:return true}}
function stageUnlocked(ch,idx){const c=CHMAP[ch];if(!chapterUnlocked(ch))return false;
  if(c.kind==='sol')return idx===0||!!(SV.cleared.sol&&SV.cleared.sol[String(idx-1)]);
  if(c.kind==='ul')return idx===0||!!(SV.cleared.ul&&SV.cleared.ul[String(idx-1)]);
  if(c.kind==='aku')return idx===0||!!(SV.cleared.aku&&SV.cleared.aku[String(idx-1)]);
  return idx===0||!!(SV.cleared[ch]&&SV.cleared[ch][String(idx-1)])}
function totalStages(ch){const c=CHMAP[ch];return c.kind==='story'?48:c.kind==='sol'?240:c.kind==='ul'?80:c.kind==='aku'?13:c.kind==='dojo'?15:6}

/* ============================== STAT CALC ============================== */
const RARITY_LV={normal:{cap:50,plusCap:40,gxp:1},special:{cap:50,plusCap:40,gxp:1.1},rare:{cap:50,plusCap:30,gxp:1.4},srar:{cap:50,plusCap:30,gxp:1.6},uber:{cap:50,plusCap:30,gxp:2},legend:{cap:50,plusCap:30,gxp:2.4}};
const FRUIT_COST={rare:{1:{red:3,green:2},2:{red:5,green:4,yellow:2}},srar:{1:{green:4,yellow:3},2:{green:6,yellow:5,blue:3}},uber:{1:{blue:4,purple:3},2:{blue:6,purple:5,epic:2}},legend:{1:{purple:5,epic:3},2:{purple:8,epic:5,ancient:2}},special:{1:{red:3,green:3},2:{red:5,green:5,yellow:3}},normal:{}};
function catOwned(id){return !!SV.cats[id]}
function catLv(id){const s=SV.cats[id];return s?s.lv:1}
function catPlus(id){const s=SV.cats[id];return s?s.plus:0}
function catForm(id){const c=CATMAP[id];const s=SV.cats[id]||{lv:1};let best=0;for(let i=1;i<c.forms.length;i++){const need=i===1?10:(c.rarity==='normal'?20:30);const fc=FRUIT_COST[c.rarity]&&FRUIT_COST[c.rarity][i];if(s.lv>=need&&s['ev'+i])best=i}return best}
function catFormUnlockedCount(id){const c=CATMAP[id];const s=SV.cats[id]||{lv:1};let n=1;for(let i=1;i<c.forms.length;i++){const need=i===1?10:(c.rarity==='normal'?20:30);const fc=FRUIT_COST[c.rarity]&&FRUIT_COST[c.rarity][i];if(s.lv>=need&&s['ev'+i])n++}return n}
function lvlUpCost(id){const c=CATMAP[id];const lv=catLv(id);const r=RARITY_LV[c.rarity];if(lv>=r.cap)return null;return Math.floor(45*Math.pow(lv,1.32)*r.gxp)}
function plusUpCost(id){return Math.floor(800*Math.pow(catPlus(id)+1,1.6))}
function catTalents(id){return CATMAP[id].tal||[]}
function talentLv(id,i){const t=SV.np2[id];return t?t[i]||0:0}
function catStats(id,formIdx,costMul){
  const c=CATMAP[id];const fi=formIdx===undefined?catForm(id):formIdx;const f=c.forms[fi];const s=SV.cats[id]||{lv:1,plus:0};
  const effLv=s.lv+s.plus*0.5;const g=1+f.g*(effLv-1);const plus=1+s.plus*0.02;
  let hp=f.hp*g*plus*treasureMult('hp'),atk=f.atk*g*plus*treasureMult('atk');
  let spd=f.speed*WALK_SPD,cd=f.cd,cost=Math.round(f.cost*(costMul||1)),kb=f.kb,range=f.range,rate=f.rate;
  const tals=catTalents(id);(c.tal||[]).forEach((t,i)=>{const lv=talentLv(id,i);if(!lv||!t.e)return;const m=lv*0.05;if(t.e.hp)hp*=1+t.e.hp*lv;if(t.e.atk)atk*=1+t.e.atk*lv;if(t.e.spd)spd*=(1+t.e.spd*lv*0.5);if(t.e.kb)kb+=0;});
  hp*=1;cd*=Math.max(0.4,Math.pow(0.94,SV.base.research-1)/treasureMult('speed')); // Research upgrades + 'speed' treasures both SHORTEN cooldown (overall floor 0.4x)
  return {hp:Math.round(hp),atk:Math.round(atk),rate,range,speed:spd,kb,cost,cd,f,fi}
}
function unlockCat(id,src){if(SV.cats[id])return false;SV.cats[id]={lv:1,plus:0};if(src==='dupe'){const c=CATMAP[id];const np={rare:1,srar:2,uber:5,legend:10}[c.rarity]||0;SV.np+=np;SV.dupeXp+=200;return {dupe:true,np}}persist();return {new:true}}
function rollGacha(bannerId){
  // NOTE: seed must vary per roll — 10+1 pulls loop within the same millisecond, so now()-only seeds made every card identical
  const R=rnd((now()+((Math.random()*4294967296)>>>0))>>>0);const r=R();
  let pool;const B=BANNERS.find(b=>b.id===bannerId);
  // banner odds (rare+ only — normals never drop): rare=89/9/2 · legend=3/27/70 · uber-pool=9/23/68
  if(bannerId==='rare'){pool=r<0.89?'rare':r<0.98?'srar':'uber'}
  else if(bannerId==='legend'){pool=r<0.03?'legend':r<0.30?'uber':'rare'}
  else{pool=r<0.09?'uber':r<0.32?'srar':'rare'} // uber + any future uber-pool banner
  let cands=CATS.filter(c=>c.rarity===pool&&c.unlock&&c.unlock.gacha===pool);
  if(!cands.length){ // fallback: walk populated gacha pools so a pull NEVER returns null
    for(const p2 of ['rare','srar','uber','legend']){cands=CATS.filter(c=>c.rarity===p2&&c.unlock&&c.unlock.gacha===p2);if(cands.length){pool=p2;break}}}
  if(!cands.length)return null; // unreachable: every gacha pool is populated
  const feat=B&&B.feat||[];let cat=pick(cands,R);if(feat.length&&R()<0.25){const f=CATMAP[pick(feat,R)];if(f&&f.rarity===pool)cat=f} // featured boost only replaces within the rolled rarity (keeps banner odds 89/9/2 · 3/27/70 · 9/23/68 honest)
  return cat.id}
const BANNERS=[
 {id:'rare',n:'Rare Cat Capsules',cost:150,cost10:1500,pool:'rare',feat:['neko','pogo','cutter'],col:'#ff7ab8',col2:'#e8489a',cap:'#ffd9ec'},
 {id:'uber',n:'Uberfest: Epic Capsules',cost:150,cost10:1500,pool:'uber',feat:['catman','mechabun','gao'],col:'#9a6adf',col2:'#6a35b0',cap:'#e2d2ff'},
 {id:'legend',n:'Legend Festival',cost:150,cost10:1500,pool:'legend',feat:['luza','gatr'],col:'#e8a020',col2:'#b06a08',cap:'#ffe9b8'},
 {id:'epic',n:'Dark Heroes: Epicforce',cost:150,cost10:1500,pool:'uber',feat:['dioramos','kaguya','noble'],col:'#5a6a8a',col2:'#2e3a55',cap:'#d4def0'}];
function activeBanners(){const wd=new Date().getDay();return [BANNERS[0],wd%2===0?BANNERS[1]:BANNERS[3],BANNERS[2]]}
const COMBOS=[
 {ids:['cat','tank'],n:'Cat Family',eff:{walletStart:100}},
 {ids:['cat','axe','tank'],n:'Brawlers',eff:{atk:.03}},
 {ids:['cow','bird'],n:'Speed Demons',eff:{spd:.05}},
 {ids:['gross','lizard'],n:'Long Range Squad',eff:{atk:.04}},
 {ids:['neko','pogo'],n:'Weird Cats',eff:{walletStart:120}},
 {ids:['can','cyborg'],n:'Machos',eff:{atk:.05}},
 {ids:['catman','gao'],n:'Uber Power',eff:{atk:.08}},
 {ids:['fish','titan'],n:'Iron Wall',eff:{hp:.05}},
 {ids:['mr','boogie'],n:'Class Clowns',eff:{xp:.05}},
 {ids:['sorcerer','medusa'],n:'Hex Squad',eff:{slow:.1}},
 {ids:['rock','titan'],n:'Stonewall',eff:{hp:.06}},
 {ids:['pirate','seafarer'],n:'Maritime Crew',eff:{walletStart:150}},
 {ids:['kungfu','slime'],n:'Dojo Training',eff:{atk:.04}},
 {ids:['thief','mr'],n:'Sneaky Scheme',eff:{xp:.06}},
 {ids:['guitar','gatr'],n:'Band Rehearsal',eff:{spd:.06}},
 {ids:['cutter','neko'],n:'Sharp Edge',eff:{atk:.04}},
 {ids:['paladin','medusa'],n:'Gorgon Guard',eff:{slow:.12}},
 {ids:['catman','dioramos'],n:'Sky Tyrants',eff:{atk:.07}},
 {ids:['mechabun','noble'],n:'Noble Mecha',eff:{hp:.05}},
 {ids:['luza','bahamut'],n:'Ancient Rulers',eff:{atk:.1}},
 {ids:['kaguya','boogie'],n:'Moonlight Dance',eff:{xp:.08}},
 {ids:['gross','cow'],n:'Charge Squad',eff:{spd:.05}},
 {ids:['cyborg','lizard'],n:'Reptile Tech',eff:{atk:.05}},
 {ids:['fish','sushi'],n:'Dinner Party',eff:{walletStart:130}},
 {ids:['axe','cutter','pirate'],n:'Cutlass Crew',eff:{atk:.06}},
 {ids:['island','sushi'],n:'Island Resort',eff:{hp:.05}},
 {ids:['archer','bird'],n:'Arrow Storm',eff:{atk:.04}},
 {ids:['fortune','kotatsu'],n:'Cozy Winter',eff:{walletStart:140}},
 {ids:['jurassic','lizard'],n:'Ancient Lizards',eff:{atk:.05}}];
function comboBonuses(teamIds){const out={walletStart:0,atk:0,hp:0,spd:0,xp:0,slow:0};for(const cb of COMBOS){if(cb.ids.every(i=>teamIds.includes(i)))for(const k in cb.eff)out[k]+=cb.eff[k]}return out}

/* ============================== BASE UPGRADES ============================== */
const BASE_UPG={wallet:{n:'Wallet Size',d:'Raises max ¢ in battle'},worker:{n:'Worker Efficiency',d:'Raises ¢ income rate'},cpow:{n:'Cannon Power',d:'Boosts cannon effects'},crch:{n:'Cannon Recharge',d:'Faster cannon charge'},bhp:{n:'Cat Base HP',d:'Raises cat base health'},research:{n:'Research Speed',d:'Shortens unit cooldowns'},account:{n:'Accounting',d:'Boosts XP rewards'}};
function baseUpCost(k){const lv=SV.base[k];return Math.floor(1500*Math.pow(lv,1.9))}
function battleWalletMax(){return Math.round(500*(1+0.35*(SV.base.wallet-1))*treasureMult('wallet'))}
function battleRegen(){return (7+2.8*(SV.base.worker-1))*treasureMult('worker')}
function cannonChargeBase(){return 35*Math.pow(0.92,SV.base.crch-1)/(1+(treasureMult('cannon')-1)*0.5)}
const CANNON_TYPES=[
 {id:'standard',n:'Cat Cannon',d:'Classic shockwave: damage + knockback all',col:'#e84830',ring:'#ffd23f',unlock:null},
 {id:'slow',n:'Slow Beam Cannon',d:'Slows all enemies for 6s',col:'#4a7ac0',ring:'#a0d8ff',unlock:{ch:'itf1',st:47}},
 {id:'ironwall',n:'Iron Wall Cannon',d:'Deploys a blocking wall at midfield',col:'#8a7a5a',ring:'#e8d8a0',unlock:{ch:'itf2',st:47}},
 {id:'thunder',n:'Thunderbolt Cannon',d:'Freezes all enemies for 2.5s',col:'#5a5a8a',ring:'#bfe4ff',unlock:{ch:'itf3',st:47}},
 {id:'water',n:'Waterblast Cannon',d:'Pushes enemies back hard',col:'#2a8aa8',ring:'#7fd0ff',unlock:{ch:'cotc1',st:47}},
 {id:'holy',n:'Holy Blast Cannon',d:'Heavy damage to Floating & Angel',col:'#c8a030',ring:'#fff2b0',unlock:{ch:'cotc2',st:47}},
 {id:'breaker',n:'Breakerblast Cannon',d:'Breaks barriers & Aku shields',col:'#a83a3a',ring:'#ff9a6a',unlock:{ch:'cotc3',st:47}}];
function cannonUnlocked(id){const t=CANNON_TYPES.find(c=>c.id===id);if(!t||!t.unlock)return true;const cc=SV.cleared[t.unlock.ch];return !!(cc&&cc[String(t.unlock.st)])}

/* ============================== EXPEDITIONS (Scout Cat) ============================== */
/* Gamatoto-style idle meta: send your scout cat on timed trips for XP/CF/tickets/fruit.
   3 of the 5 destinations rotate daily (date-seeded) so there's always a fresh spread. */
const EXPD=[
 {id:'meadow', n:'Sunny Meadow',    mins:3,  danger:1, xp:400,   cf:15,  tk:0.10, tkr:'rare', fruit:0.10, terr:'#7fc86a', blurb:'Rolling grassland — easy pickings, quick turnaround.'},
 {id:'woods',  n:'Whispering Woods',mins:8,  danger:2, xp:1100,  cf:40,  tk:0.18, tkr:'rare', fruit:0.16, terr:'#5a8a4a', blurb:'Hushed pines full of catnip and stray treasure.'},
 {id:'peaks',  n:'Howling Peaks',   mins:15, danger:3, xp:2600,  cf:90,  tk:0.25, tkr:'rare', fruit:0.25, terr:'#9aa8b8', blurb:'Bitter winds guard a rich hoard of supplies.'},
 {id:'cavern', n:'Sunken Caverns',  mins:30, danger:4, xp:6000,  cf:180, tk:0.30, tkr:'gold', fruit:0.32, terr:'#7a6a9a', blurb:'Dripping depths where gold tickets glitter.'},
 {id:'fort',   n:'Storm Fortress',  mins:60, danger:5, xp:15000, cf:400, tk:0.14, tkr:'plat', fruit:0.50, terr:'#8a5a5a', blurb:'The scouts legend — only the boldest return loaded.'}];
function expdToday(){ // 3-of-5 daily rotation (deterministic per date)
  const R=rnd((new Date().toDateString().length*9103+new Date().getDate()*7717)>>>0);
  return EXPD.slice().sort(()=>R()-0.5).slice(0,3)}
/* ---- SCOUT RANK LADDER: trips earn scout XP (danger×12); each level pays +6% expedition rewards ---- */
const SCOUT_T=[0,40,95,165,250,350,465,595,740,900]; // cumulative XP needed to REACH level idx+1 (1-based)
const SCOUT_NAMES=['ROOKIE','TRAINED','SEASONED','PATHFINDER','VETERAN','ELITE','RANGER','TRAILBLAZER','LEGEND','MYTHIC'];
function scoutInfo(){const xp=clamp(Math.floor((SV&&SV.expedition&&SV.expedition.scoutXP)||0),0,1e6);
  let lv=1;for(let i=1;i<SCOUT_T.length;i++){if(xp>=SCOUT_T[i])lv=i+1}
  const base=SCOUT_T[lv-1],next=lv<SCOUT_T.length?SCOUT_T[lv]:null;
  const prest=clamp(Math.floor((SV&&SV.expedition&&SV.expedition.prestige)||0),0,typeof SCOUT_PRESTIGE_MAX==='number'?SCOUT_PRESTIGE_MAX:3);
  const stars=prest>0?('\u2605'.repeat(prest)):'';
  return{xp,lv,prest,stars,name:SCOUT_NAMES[lv-1]+(stars?' '+stars:''),cur:xp-base,need:next!==null?next-base:0,maxed:next===null,bonus:0.06*(lv-1)+0.10*prest}}
function scoutBonus(){return 1+scoutInfo().bonus}
function expdSlots(){return SV&&SV.rank>=30?2:1} // 2nd concurrent trip slot at User Rank 30
function expdActives(){return (SV&&SV.expedition&&Array.isArray(SV.expedition.actives))?SV.expedition.actives:[]}
function expdActive(idx){const a=expdActives()[idx||0];return a?{...EXPD.find(d=>d.id===a.dest),...a}:null}
function expdDone(idx){const a=expdActives()[idx||0];if(!a)return false;return now()>=a.start+a.dur*1000}
function expdAnyDone(){return expdActives().some((a,i)=>expdDone(i))}
function expdStart(destId){const d=EXPD.find(x=>x.id===destId);if(!d)return false;
  const act=SV.expedition.actives;
  if(act.some(a=>a.dest===destId))return false; // one trip per destination
  if(act.length>=expdSlots())return false;     // no free slot
  act.push({dest:destId,start:now(),dur:d.mins*60});persist();return true}
/* collect rewards for trip idx: scale with account upgrades + rank + scout rank; returns summary lines */
function expdCollect(idx){
  const act=SV.expedition.actives;const a=act[idx||0];
  if(!a||now()<a.start+a.dur*1000)return null;
  const d=EXPD.find(x=>x.id===a.dest)||{xp:0,cf:0,tk:0,tkr:'rare',fruit:0,n:'?',danger:1};
  const rankMul=1+Math.min(1,SV.rank*0.006); // up to +60% at rank 100
  const acc=1+0.15*(SV.base.account-1);
  const sb=scoutBonus();
  const xp=Math.round(d.xp*rankMul*acc*sb),cf=Math.round(d.cf*rankMul*sb);
  addXP(xp);addCF(cf);
  const lines=['+'+fmt(xp)+' XP','+'+cf+' Cat Food'];
  if(d.tk&&Math.random()<d.tk){SV.tickets[d.tkr]++;persist();lines.push('+1 '+({rare:'Rare',gold:'Gold',plat:'Platinum'})[d.tkr]+' Ticket!')}
  const fruits=Object.keys(SV.fruit).filter(k=>k!=='epic'&&k!=='ancient');
  if(d.fruit&&Math.random()<d.fruit){const f=fruits[Math.floor(Math.random()*fruits.length)];SV.fruit[f]++;persist();lines.push('+1 '+f[0].toUpperCase()+f.slice(1)+' Catfruit!')}
  // scout XP from trip danger + rank-up line
  const sXP=d.danger*12;const before=scoutInfo();
  SV.expedition.scoutXP=(SV.expedition.scoutXP||0)+sXP;
  const after=scoutInfo();
  lines.push('+'+sXP+' Scout XP');
  if(after.lv>before.lv){lines.push('SCOUT RANK UP! Now '+after.name+' (+'+Math.round(after.bonus*100)+'% rewards)')}
  if(scoutInfo().bonus>0)lines.push('Scout Rank bonus +'+Math.round(scoutInfo().bonus*100)+'% applied');
  act.splice(idx||0,1);SV.expedition.runs++;persist();
  if(SV.missions)SV.missions.exp=(SV.missions.exp||0)+1; // daily mission hook (expeditions)
  if(typeof trophyCheckAll==='function')trophyCheckAll();
  return lines}

/* ============================== TROPHY STAND ============================== */
/* Achievement meta-layer: progress is COMPUTED LIVE from save state (no drift);
   only claim/notify flags persist in SV.trophies. Grants CF/XP/tickets on claim. */
function stageClearsTotal(){let n=0;for(const ch in SV.cleared){const c=SV.cleared[ch];if(c&&typeof c==='object')for(const k in c)if(c[k])n++}return n}
function crownsTotal(){let n=0;for(const ch in SV.crowns){const c=SV.crowns[ch];if(c&&typeof c==='object')for(const k in c)n+=(c[k]||0)}return n}
function treasuresTotal(){let n=0;for(const ch in CHSETS)for(let s=0;s<CHSETS[ch].length;s++)n+=tCount(ch,s);return n}
const RW_TXT=rw=>{const p=[];if(rw.cf)p.push(fmt(rw.cf)+' CF');if(rw.xp)p.push(fmt(rw.xp)+' XP');if(rw.ticket)p.push({rare:'Rare',gold:'Gold',plat:'Platinum'}[rw.ticket]+' Ticket');return p.join(' + ')};
const TROPHY_GROUPS=[
 {id:'collect',n:'CAT COLLECTOR',icon:'cat',col:'#7fd0ff',list:[
   {id:'cats1',n:'Recruit 5 different cats',goal:5,rw:{cf:50}},
   {id:'cats2',n:'Recruit 15 different cats',goal:15,rw:{cf:100}},
   {id:'cats3',n:'Recruit 30 different cats',goal:30,rw:{cf:200}},
   {id:'cats4',n:'Recruit every single cat',goal:CATS.length,rw:{cf:500,ticket:'gold'}}]},
 {id:'story',n:'STORY VETERAN',icon:'swords',col:'#ffd94a',list:[
   {id:'cl1',n:'Clear 6 stages',goal:6,rw:{cf:60}},
   {id:'cl2',n:'Clear 48 stages (a full chapter)',goal:48,rw:{cf:150}},
   {id:'cl3',n:'Clear 120 stages',goal:120,rw:{cf:300}},
   {id:'cl4',n:'Clear 144 EoC stages',goal:144,rw:{cf:750,ticket:'gold'}}]},
 {id:'crown',n:'CROWN CHASER',icon:'crown',col:'#e8c37f',list:[
   {id:'cr1',n:'Earn 12 crowns',goal:12,rw:{cf:80,xp:2000}},
   {id:'cr2',n:'Earn 48 crowns',goal:48,rw:{cf:200,xp:8000}},
   {id:'cr3',n:'Earn 144 crowns',goal:144,rw:{cf:400,xp:25000}}]},
 {id:'summon',n:'GRAND SUMMONER',icon:'capsule',col:'#ff9ad5',list:[
   {id:'sm1',n:'Pull the Gacha 10 times',goal:10,rw:{cf:50}},
   {id:'sm2',n:'Pull the Gacha 60 times',goal:60,rw:{cf:120}},
   {id:'sm3',n:'Pull the Gacha 200 times',goal:200,rw:{cf:300,ticket:'rare'}}]},
 {id:'scout',n:'SCOUT CAPTAIN',icon:'compass',col:'#8fe0b8',list:[
   {id:'sc1',n:'Complete 5 expeditions',goal:5,rw:{cf:60}},
   {id:'sc2',n:'Complete 25 expeditions',goal:25,rw:{cf:150}},
   {id:'sc3',n:'Reach Scout Rank 5',goal:5,rw:{cf:200,ticket:'rare'}}]},
 {id:'best',n:'MONSTER HUNTER',icon:'doge',col:'#c9c9d6',list:[
   {id:'bs1',n:'Discover 20 enemies',goal:20,rw:{cf:50}},
   {id:'bs2',n:'Discover 40 enemies',goal:40,rw:{cf:120}},
   {id:'bs3',n:'Complete the bestiary',goal:ENEMIES.length,rw:{cf:300}}]},
 {id:'trea',n:'TREASURE SEEKER',icon:'chest',col:'#e8c37f',list:[
   {id:'tr1',n:'Collect 15 treasure tiers',goal:15,rw:{cf:60}},
   {id:'tr2',n:'Collect 45 treasure tiers',goal:45,rw:{cf:150}},
   {id:'tr3',n:'Collect 108 treasure tiers',goal:108,rw:{cf:350,ticket:'rare'}}]},
 {id:'dojo',n:'DOJO MASTER',icon:'medal',col:'#c46adf',list:[
   {id:'dj1',n:'Score 50+ in the Dojo',goal:50,rw:{cf:60,xp:1500}},
   {id:'dj2',n:'Score 150+ in the Dojo',goal:150,rw:{cf:150,xp:5000}},
   {id:'dj3',n:'Score 400+ in the Dojo',goal:400,rw:{cf:300,xp:15000}}]},
 {id:'rank',n:'RISING STAR',icon:'up',col:'#7fe8a0',list:[
   {id:'rk1',n:'Reach User Rank 10',goal:10,rw:{cf:60}},
   {id:'rk2',n:'Reach User Rank 25',goal:25,rw:{cf:150}},
   {id:'rk3',n:'Reach User Rank 50',goal:50,rw:{cf:300,ticket:'rare'}}]},
 {id:'streak',n:'LOYAL COMMANDER',icon:'flame',col:'#e85840',list:[
   {id:'st1',n:'Log in 7 days in a row',goal:7,rw:{cf:80}},
   {id:'st2',n:'Log in 14 days in a row',goal:14,rw:{cf:150,ticket:'rare'}},
   {id:'st3',n:'Log in 30 days in a row',goal:30,rw:{cf:400,ticket:'gold'}}]},
 {id:'shrine',n:'SHRINE DEVOTEE',icon:'torii',col:'#ffb0c8',list:[
   {id:'sh1',n:'Pray at the Cat Shrine 3 times',goal:3,rw:{cf:60}},
   {id:'sh2',n:'Pray at the Cat Shrine 15 times',goal:15,rw:{cf:150}},
   {id:'sh3',n:'Receive a MEGA blessing',goal:1,rw:{cf:200,ticket:'gold'}}]}];
function trophyList(){return TROPHY_GROUPS.flatMap(g=>g.list.map(t=>({...t,group:g})))}
function trophyProg(t){switch(t.id.slice(0,2)){
  case 'ca':return Object.keys(SV.cats).length;
  case 'cl':return stageClearsTotal();
  case 'cr':return crownsTotal();
  case 'sm':return (SV.stats&&SV.stats.pulls)||0;
  case 'sc':return t.n.includes('Rank')?scoutInfo().lv:(SV.expedition.runs||0);
  case 'bs':return Object.keys(SV.bestiary).length;
  case 'tr':return treasuresTotal();
  case 'dj':return SV.dojoBest||0;
  case 'rk':return SV.rank;
  case 'sh':return t.n.includes('MEGA')?(SV.shrine?SV.shrine.megaN||0:0):(SV.shrine?SV.shrine.total||0:0);
  default:return SV.dailyStreak||0}}
function trophyDone(t){return trophyProg(t)>=t.goal}
function trophyClaimable(t){return trophyDone(t)&&!SV.trophies.claimed[t.id]}
function trophyClaimCount(){return trophyList().filter(trophyClaimable).length}
function claimTrophy(id){const t=trophyList().find(x=>x.id===id);if(!t||!trophyClaimable(t))return null;
  SV.trophies.claimed[id]=1;SV.trophies.notified[id]=1;
  const rw=t.rw;if(rw.cf)SV.cf+=rw.cf;if(rw.xp)addXP(rw.xp);
  if(rw.ticket){SV.tickets[rw.ticket]=(SV.tickets[rw.ticket]||0)+1}
  persist();SFX.up();
  return t}
/* fire once per newly-claimable trophy: toast + notify flag (dedupes across frames) */
function trophyCheckAll(){let any=false;
  for(const t of trophyList()){
    if(trophyClaimable(t)&&!SV.trophies.notified[t.id]){
      SV.trophies.notified[t.id]=1;any=true;
      toast('TROPHY UNLOCKED: '+t.n+' — claim at the Trophy Stand!','#c46adf')}}
  if(any)persist();
  return any}

/* ============================== CAT SHRINE (daily blessings) ============================== */
/* Nyanko Shrine meta: toss a coin in the offering box once a day for free (extra tosses cost
   Cat Food). Blessings scale with User Rank; the free toss carries a boosted jackpot weight.
   Only flags/counters persist — rewards apply immediately on reveal. */
const SHRINE_MAX_EXTRA=3;               // paid tosses per day beyond the free one
const SHRINE_COST=50;                   // Cat Food per paid toss
const SHRINE_BLESSINGS=[
 {id:'xp',   n:'Wisdom of the Ancients', col:'#7fd0ff', icon:'up',      w:22, jackpot:false,
  line:r=>'+'+fmt(r.n)+' XP — the shrine cats shared their scrolls!'},
 {id:'cf',   n:'Offering Repaid',        col:'#ffd23f', icon:'cat',     w:20, jackpot:false,
  line:r=>'+'+r.n+' Cat Food — twice your coin, back with a blessing!'},
 {id:'en',   n:'Energy Surge',           col:'#54e0f0', icon:'bolt',    w:14, jackpot:false,
  line:r=>'Energy fully restored ('+r.n+'/'+r.n+') — the lanterns glow bright!'},
 {id:'rare', n:'Lucky Ticket Charm',     col:'#ffb060', icon:'scroll',  w:12, jackpot:false,
  line:r=>'+1 Rare Ticket — a fortune slip fluttered down!'},
 {id:'fruit',n:'Catfruit Harvest',       col:'#ff9ad5', icon:'capsule', w:10, jackpot:false,
  line:r=>'+1 '+r.fruitLabel+' Catfruit — the offering tree bloomed overnight!'},
 {id:'np',   n:'Insight of the Elders',  col:'#c9a8e8', icon:'compass', w:8, jackpot:false,
  line:r=>'+'+r.n+' NP — the elders whispered their secrets!'},
 {id:'gold', n:'Golden Fortune',         col:'#e8c37f', icon:'chest',   w:6, jackpot:false,
  line:r=>'+1 Gold Ticket — a golden glint in the offering box!'},
 {id:'mega', n:'MEGA BLESSING',          col:'#c46adf', icon:'trophy',  w:3, jackpot:true,
  line:r=>'+'+r.cf+' Cat Food · +'+fmt(r.xp)+' XP · +1 Rare Ticket — THE SHRINE GOD SMILED!'}];
/* roll one blessing (weighted; free toss doubles jackpot weight), compute rank-scaled rewards */
function shrineRoll(free){
  const pool=SHRINE_BLESSINGS.map(b=>({b,w:b.w*(b.jackpot&&free?2:1)}));
  const tot=pool.reduce((a,p)=>a+p.w,0);
  let r=Math.random()*tot,pick=pool[0].b;
  for(const p of pool){r-=p.w;if(r<=0){pick=p.b;break}}
  const rankMul=1+Math.min(1.5,SV.rank*0.012); // up to +150% at high rank
  const res={id:pick.id,name:pick.n,col:pick.col,icon:pick.icon,jackpot:pick.jackpot,n:0};
  if(pick.id==='xp')res.n=Math.round((900+SV.rank*180)*rankMul);
  else if(pick.id==='cf')res.n=Math.round(90*rankMul);
  else if(pick.id==='en')res.n=energyMax();
  else if(pick.id==='rare')res.n=1;
  else if(pick.id==='fruit'){const ks=Object.keys(SV.fruit).filter(k=>k!=='epic'&&k!=='ancient');
    res.fruit=ks[Math.floor(Math.random()*ks.length)];res.fruitLabel=res.fruit[0].toUpperCase()+res.fruit.slice(1);res.n=1}
  else if(pick.id==='np')res.n=Math.max(3,Math.round(2+SV.rank*0.25));
  else if(pick.id==='gold')res.n=1;
  else if(pick.id==='mega'){res.cf=Math.round(220*rankMul);res.xp=Math.round(2400*rankMul);res.n=0}
  return res}
/* apply a rolled blessing to the save; returns nothing (rewards already inside res) */
function shrineApply(res){
  if(res.id==='xp')addXP(res.n);
  else if(res.id==='cf')addCF(res.n);
  else if(res.id==='en'){SV.energy=energyMax();SV.energyTs=now()}
  else if(res.id==='rare')SV.tickets.rare++;
  else if(res.id==='fruit')SV.fruit[res.fruit]++;
  else if(res.id==='np'){SV.np+=res.n}
  else if(res.id==='gold')SV.tickets.gold++;
  else if(res.id==='mega'){addCF(res.cf);addXP(res.xp);SV.tickets.rare++}
  const S=SV.shrine;S.total++;S.todayN++;S.lastBless=res.n;S.lastId=res.id;
  if(res.jackpot)S.megaN++;
  persist();
  if(typeof trophyCheckAll==='function')trophyCheckAll();
  return true}
/* state helpers: {day,freeUsed,todayN,total,megaN,lastId,lastBless} — day rolls reset counters */
function shrineInfo(){const S=SV.shrine;
  if(S.day!==todayKey()){S.day=todayKey();S.freeUsed=false;S.todayN=0}
  const extraUsed=Math.max(0,S.todayN-(S.freeUsed?1:0));
  return{freeLeft:!S.freeUsed,extraLeft:Math.max(0,SHRINE_MAX_EXTRA-extraUsed),
    extraUsed,todayN:S.todayN,total:S.total,megaN:S.megaN||0,
    cost:SHRINE_COST,lastId:S.lastId||null,lastBless:S.lastBless||0}}
/* begin a pray: returns {res,free} on success, null when not allowed */
function shrinePray(){
  const si=shrineInfo();const free=si.freeLeft;
  if(!free){ // paid toss
    if(si.extraLeft<=0){toast('The shrine is resting — come back tomorrow!','#ffb060');SFX.error();return null}
    if(SV.cf<SHRINE_COST){toast('Not enough Cat Food ('+SHRINE_COST+' CF needed)','#ff7a7a');SFX.error();return null}
    SV.cf-=SHRINE_COST}
  else SV.shrine.freeUsed=true;
  const res=shrineRoll(free);
  return{res,free}}
/* ---- scout prestige: after MYTHIC (900 XP) reset XP for a permanent ★ bonus ---- */
const SCOUT_PRESTIGE_MAX=3;
function scoutPrestige(){const s=scoutInfo();
  if(!s.maxed)return false;
  const ex=SV.expedition;
  ex.prestige=clamp(Math.floor(ex.prestige||0)+1,0,SCOUT_PRESTIGE_MAX);
  ex.scoutXP=0;persist();SFX.up();
  return true}

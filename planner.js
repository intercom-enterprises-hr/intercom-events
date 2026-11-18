/* =====================================================================
   Intercom | Trip Planner tab for hr.html  (free, no AI, runs in the browser)
   Builds a full trip plan from the form: schedule, places ranked by
   distance, transport, food & stay, per-person budget and a draft message.
   All prices are SAMPLE prices - edit the DATA block below to update them.
   Nothing is saved anywhere until HR clicks "Save event" in the event form.
   ===================================================================== */
(function () {
  "use strict";

  /* ---------- DATA (sample 2026 prices in EGP - edit freely) ---------- */
  var DATA = {
    office: { name: "Company office (Cairo)", lat: 30.0444, lon: 31.2357 },
    locs: {
      lake_qarun: { name: "Lake Qarun", lat: 29.4667, lon: 30.6667, offroad: 0 },
      tunis_village: { name: "Tunis Village", lat: 29.4063, lon: 30.6728, offroad: 0 },
      qasr_el_sagha: { name: "El-Magnet / Qasr El-Sagha", lat: 29.594, lon: 30.678, offroad: 15 },
      wadi_el_rayan: { name: "Wadi El-Rayan", lat: 29.198, lon: 30.405, offroad: 0 },
      wadi_el_hitan: { name: "Wadi El-Hitan (UNESCO)", lat: 29.2706, lon: 30.0436, offroad: 35 }
    },
    /* slot: 1 morning, 2 midday, 3 sunset, 4 evening */
    stops: [
      { id: "rayan", loc: "wadi_el_rayan", title: "Wadi El-Rayan Waterfalls", text: "Egypt's only waterfalls, golden dunes and lots of photos.", hours: 2, slot: 1, pp: 75, perVehicle: 50, scene: "generic", def: true },
      { id: "desert", loc: "wadi_el_rayan", title: "Jeep Convoy & Sand-boarding", text: "4x4 jeeps into the dunes near Magic Lake, then sand-boarding.", hours: 2.5, slot: 2, pp: 100, jeep: true, scene: "jeep" },
      { id: "hitan", loc: "wadi_el_hitan", title: "Wadi El-Hitan (Valley of the Whales)", text: "UNESCO site with 40-million-year-old whale fossils and a desert museum.", hours: 3, slot: 1, pp: 100, perVehicle: 50, jeep: true, scene: "jeep", twoDay: true },
      { id: "sagha", loc: "qasr_el_sagha", title: "El-Magnet / Qasr El-Sagha", text: "A small ancient temple in the desert above Lake Qarun.", hours: 1.5, slot: 1, pp: 60, jeep: true, scene: "jeep" },
      { id: "tunis", loc: "tunis_village", title: "Tunis Village", text: "Pottery workshops, galleries and countryside views.", hours: 1.5, slot: 2, pp: 0, scene: "generic", def: true },
      { id: "qarun", loc: "lake_qarun", title: "Lake Qarun Sunset", text: "Boat ride and sunset by the lake.", hours: 1.5, slot: 3, pp: 50, scene: "beach", def: true },
      { id: "camp", loc: "wadi_el_rayan", title: "Camp, Grill & Stargaze", text: "Grill dinner by the campfire, games and a sky full of stars.", hours: 3, slot: 4, pp: 0, dinner: 350, scene: "camp" }
    ],
    pottery: 150,
    meals: {
      road: { label: "Breakfast stop on the road (foul & ta'meya)", pp: 100, min: 30 },
      tunisBreakfast: { label: "Fiteer breakfast in Tunis Village", pp: 200, min: 60 },
      packed: { label: "Packed breakfast boxes on the bus", pp: 80, min: 0 },
      lunch: {
        tunis_village: ["Group lunch at a countryside restaurant in Tunis Village", 450],
        lake_qarun: ["Fish lunch on the Lake Qarun shore", 400],
        wadi_el_rayan: ["Simple lunch at the Wadi El-Rayan cafeteria", 150],
        wadi_el_hitan: ["Packed lunch boxes (no restaurant at Wadi El-Hitan)", 200],
        qasr_el_sagha: ["Packed lunch boxes", 200]
      },
      dinner: {
        tunis_village: ["Dinner in Tunis Village", 450],
        lake_qarun: ["Fish dinner by Lake Qarun", 400],
        wadi_el_rayan: ["Grill dinner at a desert camp", 350],
        wadi_el_hitan: ["Packed dinner boxes", 200],
        qasr_el_sagha: ["Packed dinner boxes", 200]
      }
    },
    vehicles: [
      { id: "hiace", name: "HiAce microbus + driver", seats: 14, day: 3500, night: 500 },
      { id: "coaster", name: "Coaster mini-bus + driver", seats: 28, day: 6000, night: 600 },
      { id: "bus", name: "Tourist bus + driver", seats: 50, day: 9500, night: 800 }
    ],
    cars: { seats: 4, perKm: 2.2, tolls: 60 },
    jeep: { seats: 6, perDay: 2500 },
    hotels: [
      { id: "tunis_ecolodge", loc: "tunis_village", name: "Eco-lodge in Tunis Village", rooms: [["double", 2, 2200], ["triple", 3, 2900]] },
      { id: "qarun_hotel", loc: "lake_qarun", name: "Lakeside hotel on Lake Qarun", rooms: [["double", 2, 3000], ["triple", 3, 3800]] },
      { id: "rayan_camp", loc: "wadi_el_rayan", name: "Desert camp near Wadi El-Rayan (tents)", rooms: [["2-person tent", 2, 1200], ["4-person tent", 4, 2000]] }
    ],
    /* Fayoum monthly climate averages: [high, low, sunset] */
    climate: { 1: [20, 6, "17:15"], 2: [22, 7, "17:40"], 3: [25, 10, "18:00"], 4: [30, 13, "18:15"], 5: [34, 17, "18:35"], 6: [37, 20, "18:55"], 7: [37, 21, "18:55"], 8: [37, 21, "18:35"], 9: [35, 19, "18:00"], 10: [31, 16, "17:25"], 11: [26, 11, "17:00"], 12: [21, 7, "16:55"] }
  };

  /* ---------- helpers ---------- */
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : String(s); return d.innerHTML; }
  function egp(n) { return Math.round(n).toLocaleString("en-US") + " EGP"; }
  function num(n) { return Math.round(n).toLocaleString("en-US"); }
  function locOf(id) { return id === "office" ? DATA.office : DATA.locs[id]; }
  function km(a, b) {
    var R = 6371, r = Math.PI / 180, A = locOf(a), B = locOf(b);
    var h = Math.pow(Math.sin((B.lat - A.lat) * r / 2), 2) + Math.cos(A.lat * r) * Math.cos(B.lat * r) * Math.pow(Math.sin((B.lon - A.lon) * r / 2), 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function leg(a, b) {
    if (a === b) return { km: 0, min: 0 };
    var off = Math.max((locOf(a).offroad || 0), (locOf(b).offroad || 0));
    var road = Math.max(km(a, b) * 1.35, off);
    var min = ((road - off) / 65 + off / 25) * 60;
    return { km: Math.round(road), min: Math.round(min / 5) * 5 };
  }
  function hm(t) { var h = Math.floor(t / 60) % 24, m = Math.round(t % 60); if (m === 60) { h++; m = 0; } var ap = h >= 12 ? "PM" : "AM", h12 = h % 12 || 12; return h12 + ":" + (m < 10 ? "0" : "") + m + " " + ap; }
  function toMin(s) { var p = String(s || "07:00").split(":"); return (+p[0]) * 60 + (+p[1] || 0); }
  function ceil50(n) { return Math.ceil(n / 50) * 50; }
  function stopById(id) { return DATA.stops.filter(function (s) { return s.id === id; })[0]; }

  /* ---------- planning ---------- */
  function orderStops(list, from) {
    var out = [], left = list.slice(), cur = from;
    while (left.length) {
      var minSlot = Math.min.apply(null, left.map(function (s) { return s.slot; }));
      var cands = left.filter(function (s) { return s.slot === minSlot; });
      cands.sort(function (x, y) { return km(cur, x.loc) - km(cur, y.loc); });
      var pick = cands[0]; out.push(pick); left.splice(left.indexOf(pick), 1); cur = pick.loc;
    }
    return out;
  }

  /* Best order for the daytime stops of one day: shortest driving, morning stops first,
     and no daytime stop ending after sunset. Tries every order (at most a few hundred). */
  function bestOrder(list, from, to, startT, sunset) {
    if (list.length < 2) return list.slice();
    if (list.length > 6) return orderStops(list, from);
    var best = null, bestScore = Infinity;
    (function perm(arr, k) {
      if (k === arr.length) {
        var t = startT, at = from, drive = 0, pen = 0;
        for (var i = 0; i < arr.length; i++) {
          var m = leg(at, arr[i].loc).min; drive += m; t += m + arr[i].hours * 60; at = arr[i].loc;
          if (t > sunset + 20) pen += 1000;
          for (var j = i + 1; j < arr.length; j++) if (arr[j].slot < arr[i].slot) pen += 20;
        }
        drive += to ? leg(at, to).min : 0;
        if (drive + pen < bestScore) { bestScore = drive + pen; best = arr.slice(); }
        return;
      }
      for (var x = k; x < arr.length; x++) { var a = arr.slice(); var tmp = a[k]; a[k] = a[x]; a[x] = tmp; perm(a, k + 1); }
    })(list.slice(), 0);
    return best;
  }

  function cheapestRooms(h, n) {
    var a = h.rooms[0], b = h.rooms[1], best = null;
    for (var nb = 0; nb <= Math.ceil(n / b[1]); nb++) {
      var na = Math.max(0, Math.ceil((n - nb * b[1]) / a[1])), c = nb * b[2] + na * a[2];
      if (!best || c < best.cost) best = { cost: c, text: [nb ? nb + " × " + b[0] : "", na ? na + " × " + a[0] : ""].filter(Boolean).join(" + ") };
    }
    return best;
  }

  function build(f) {
    var n = f.people, days = f.days, warn = [], month = new Date(f.date + "T12:00:00").getMonth() + 1;
    var cl = DATA.climate[month] || DATA.climate[12], sunset = toMin(cl[2]);
    var chosen = DATA.stops.filter(function (s) { return f.stops.indexOf(s.id) > -1; });
    if (!chosen.length) return { error: "Pick at least one place to visit." };

    /* split over days: evening-type stops (sunset / camp) close day 1 */
    var ordered = orderStops(chosen, "office"), dayLists = [ordered];
    if (days === 2) {
      /* Day 1: as many daytime stops as fit before the evening, then the sunset / camp stops.
         Day 2: the rest, starting from the overnight stay. */
      var dayT = ordered.filter(function (s) { return s.slot <= 2; }), eve = ordered.filter(function (s) { return s.slot > 2; });
      var cap = sunset - (eve.length ? 60 : 15), d1 = [], rest = [];
      var estEnd = function (list) {
        var t = toMin(f.gather) + 15 + (f.breakfast === "road" ? 30 : f.breakfast === "tunis" ? 60 : 0) + 60, at = "office";
        list.forEach(function (s) { t += leg(at, s.loc).min + s.hours * 60; at = s.loc; });
        return { t: t + (eve.length ? leg(at, eve[0].loc).min : 0) };
      };
      dayT.forEach(function (s) { var trial = orderStops(d1.concat([s]), "office"); if (!d1.length || estEnd(trial).t <= cap) d1 = trial; else rest.push(s); });
      dayLists = [orderStops(d1, "office").concat(orderStops(eve, d1.length ? d1[d1.length - 1].loc : "office")), rest];
      if (!rest.length) warn.push("Everything fits on day 1, so day 2 only has the drive home. Add more places, or plan a one-day trip.");
    }
    if (days === 1 && chosen.some(function (s) { return s.twoDay; })) warn.push("Wadi El-Hitan is far (35 km of desert track). It fits much better in a two-day trip.");
    if (month >= 5 && month <= 9) warn.push("Summer: it is very hot (about " + cl[0] + "°C). Keep outdoor stops before 11:00 AM or after 4:00 PM, and bring lots of water.");

    var hotel = null;
    if (days === 2) {
      var lastLoc = dayLists[0].length ? dayLists[0][dayLists[0].length - 1].loc : "tunis_village";
      var hs = DATA.hotels.map(function (h) { var r = cheapestRooms(h, n); return { h: h, rooms: r.text, cost: r.cost }; });
      hotel = f.hotel === "auto"
        ? hs.slice().sort(function (x, y) { return km(lastLoc, x.h.loc) - km(lastLoc, y.h.loc); })[0]
        : hs.filter(function (x) { return x.h.id === f.hotel; })[0] || hs[0];
      hotel.all = hs;
    }
    /* put each day's daytime stops in the best order; sunset / evening stops stay last */
    var start1 = toMin(f.gather) + 15 + (f.breakfast === "road" ? 30 : f.breakfast === "tunis" ? 60 : 0) + 60;
    dayLists = dayLists.map(function (list, d) {
      var dayS = list.filter(function (s) { return s.slot <= 2; }), eveS = list.filter(function (s) { return s.slot > 2; });
      var from = d === 0 ? (f.breakfast === "tunis" ? "tunis_village" : "office") : (hotel ? hotel.h.loc : "office");
      var to = eveS.length ? eveS[0].loc : (d === dayLists.length - 1 ? "office" : (hotel ? hotel.h.loc : null));
      return bestOrder(dayS, from, to, d === 0 ? start1 : toMin("09:30"), sunset).concat(eveS);
    });

    var items = [], costs = [], totalKm = 0, jeepDays = 0, sched = [], prog = [];
    function cost(cat, label, amount, per) { costs.push({ cat: cat, label: label, total: per === "pp" ? amount * n : amount }); }

    var mealPP = { breakfast: 0 };
    for (var d = 0; d < dayLists.length; d++) {
      var list = dayLists[d], rows = [], t, at;
      if (d === 0) { t = toMin(f.gather); rows.push({ t: t, title: "Meet & Mingle", text: "We gather at the company office and leave 15 minutes later.", scene: "bus" }); t += 15; at = "office"; }
      else { t = toMin("08:30"); at = hotel ? hotel.h.loc : (list[0] ? list[0].loc : "office"); rows.push({ t: toMin("07:30"), title: "Breakfast", text: "At " + (hotel ? hotel.h.name : "the hotel") + " (included with the stay).", scene: "breakfast" }); }

      /* the road stop happens about 80 min into the first drive, so it only adds its own 30 min */
      var roadStop = null;
      if (d === 0 && f.breakfast === "road") { roadStop = { t: t + 80, title: "Breakfast stop", text: DATA.meals.road.label, scene: "breakfast" }; cost("food", DATA.meals.road.label, DATA.meals.road.pp, "pp"); }
      if (d === 0 && f.breakfast === "packed") cost("food", DATA.meals.packed.label, DATA.meals.packed.pp, "pp");
      if (d === 0 && f.breakfast === "tunis") {
        var lg0 = leg(at, "tunis_village"); totalKm += lg0.km; t += lg0.min; at = "tunis_village";
        rows.push({ t: t, title: "Tunis Village Breakfast", text: "Hot, flaky fiteer meshaltet with honey.", scene: "breakfast", drive: lg0 }); t += 60;
        cost("food", DATA.meals.tunisBreakfast.label, DATA.meals.tunisBreakfast.pp, "pp");
      }

      var hadLunch = false, usedJeep = false, hadDinner = false;
      for (var i = 0; i < list.length; i++) {
        var s = list[i], lg = leg(at, s.loc);
        if (!hadLunch && t >= toMin("12:00") && at !== "office" && s.loc !== "tunis_village") {
          var L = DATA.meals.lunch[at] || DATA.meals.lunch.qasr_el_sagha;
          rows.push({ t: t, title: "Lunch", text: L[0], scene: "food" }); t += 60; hadLunch = true; cost("food", L[0] + (days === 2 ? " (day " + (d + 1) + ")" : ""), L[1], "pp");
        }
        if (roadStop) { if (lg.min > 90) { rows.push(roadStop); t += DATA.meals.road.min; } else { roadStop.t = t; rows.push(roadStop); t += DATA.meals.road.min; } roadStop = null; }
        totalKm += lg.km; t += lg.min; at = s.loc;
        if (!hadLunch && t >= toMin("12:30") && s.loc !== "tunis_village" && s.slot <= 2) { /* lunch on arrival */
          var La = DATA.meals.lunch[at] || DATA.meals.lunch.qasr_el_sagha;
          rows.push({ t: t, title: "Lunch", text: La[0], scene: "food", drive: lg }); lg = { km: 0, min: 0 }; t += 60; hadLunch = true; cost("food", La[0] + (days === 2 ? " (day " + (d + 1) + ")" : ""), La[1], "pp");
        }
        var dur = s.hours * 60, text = s.text;
        if (s.id === "tunis" && f.pottery) { dur += 30; text += " Pottery workshop included."; cost("activities", "Pottery workshop", DATA.pottery, "pp"); }
        if (!hadLunch && s.loc === "tunis_village" && t >= toMin("11:30") && t <= toMin("15:30")) {
          dur += 60; hadLunch = true; text += " Group lunch here."; var LT = DATA.meals.lunch.tunis_village; cost("food", LT[0] + (days === 2 ? " (day " + (d + 1) + ")" : ""), LT[1], "pp");
        }
        if (s.slot === 3 && t + dur < sunset) t = Math.max(t, sunset - dur + 15); /* arrive in time to catch the sunset */
        if (s.slot === 4 && t < sunset - 60) { /* the camp starts about an hour before sunset */
          if (sunset - 60 - t >= 30) rows.push({ t: t, title: "Free time", text: "Relax, tea and photos before the evening starts.", scene: "generic" });
          t = sunset - 60;
        }
        if (s.slot === 3 && t > sunset - 20) warn.push("You reach " + s.title + " at " + hm(t) + ", too late for the sunset (" + hm(sunset) + "). Remove a stop or leave earlier.");
        rows.push({ t: t, title: s.title, text: text, scene: s.scene, drive: lg, stop: s });
        if (s.pp) cost(s.id === "desert" ? "activities" : s.id === "qarun" ? "activities" : "tickets", s.title + (s.id === "desert" ? " (sand-boarding)" : s.id === "qarun" ? " (boat ride)" : " entry"), s.pp, "pp");
        if (s.perVehicle) cost("tickets", s.title + " vehicle entry", s.perVehicle, "group");
        if (s.dinner) { cost("food", "Camp grill dinner & campfire", s.dinner, "pp"); hadDinner = true; }
        if (s.jeep) usedJeep = true;
        if ((s.slot <= 2) && t + dur > sunset + 20) warn.push(s.title + " ends after sunset (" + hm(sunset) + "). Consider fewer stops or an earlier start.");
        t += dur;
      }
      if (usedJeep) jeepDays++;
      if (!hadLunch && list.length) { var L2 = DATA.meals.lunch[at] || DATA.meals.lunch.qasr_el_sagha; cost("food", L2[0] + (days === 2 ? " (day " + (d + 1) + ")" : ""), L2[1], "pp"); rows.push({ t: t, title: "Late lunch", text: L2[0], scene: "food" }); t += 60; }

      var lastDay = d === dayLists.length - 1;
      if ((f.dinner || (!lastDay && days === 2)) && !hadDinner) {
        var dl = lastDay ? at : (hotel ? hotel.h.loc : at), D = DATA.meals.dinner[dl] || DATA.meals.dinner.qasr_el_sagha;
        if (!lastDay && hotel && dl !== at) { var lgH = leg(at, dl); totalKm += lgH.km; t += lgH.min; at = dl; }
        rows.push({ t: t, title: "Dinner", text: D[0], scene: "food" }); t += 75; cost("food", D[0] + (days === 2 ? " (day " + (d + 1) + ")" : ""), D[1], "pp");
      }
      if (lastDay) {
        var back = leg(at, "office"); totalKm += back.km;
        rows.push({ t: t, title: "Homeward Bound", text: "We drive back to the company (about " + Math.round(back.min / 60 * 10) / 10 + " h).", scene: "bus", drive: null });
        t += back.min; rows.push({ t: t, title: "Back at the company", text: "", scene: "bus", end: true });
        if (t > toMin(f.backBy)) warn.push("You would be back around " + hm(t) + ", after the " + hm(toMin(f.backBy)) + " limit. Remove a stop or leave earlier.");
      } else if (hotel && at !== hotel.h.loc) {
        var lgN = leg(at, hotel.h.loc); totalKm += lgN.km; t += lgN.min;
        rows.push({ t: t, title: "Check in", text: hotel.h.name, scene: "generic" });
      } else if (hotel) rows.push({ t: t, title: "Overnight", text: hotel.h.name, scene: "generic" });
      sched.push(rows);
    }

    /* transport */
    var fit = DATA.vehicles.filter(function (v) { return v.seats >= n; })[0] || DATA.vehicles[DATA.vehicles.length - 1];
    var opts = DATA.vehicles.map(function (v) {
      var cnt = Math.ceil(n / v.seats), tot = cnt * (v.day * days + (days > 1 ? v.night * (days - 1) : 0));
      return { name: v.name, cnt: cnt, seats: v.seats, total: tot, rec: v === fit, note: cnt === 1 ? (v.seats - n) + " empty seats" : cnt + " vehicles" };
    });
    var cars = Math.ceil(n / DATA.cars.seats), carCost = Math.round(cars * (totalKm * DATA.cars.perKm + DATA.cars.tolls));
    opts.push({ name: "Employees' own cars (fuel + tolls)", cnt: cars, seats: DATA.cars.seats, total: carCost, rec: false, note: "needs " + cars + " volunteer drivers" });
    var rec = opts.filter(function (o) { return o.rec; })[0];
    cost("transport", rec.name + (rec.cnt > 1 ? " × " + rec.cnt : "") + (days > 1 ? " (" + days + " days)" : ""), rec.total, "group");
    if (jeepDays) { var nj = Math.ceil(n / DATA.jeep.seats); cost("transport", "4x4 jeeps × " + nj + (jeepDays > 1 ? " (" + jeepDays + " days)" : ""), nj * DATA.jeep.perDay * jeepDays, "group"); }
    if (hotel) cost("stay", hotel.h.name + " (" + hotel.rooms + ")", hotel.cost * (days - 1), "group");

    var sub = costs.reduce(function (a, c) { return a + c.total; }, 0), cont = Math.round(sub * 0.1), total = sub + cont;
    var perPerson = ceil50(total / n), budget = f.budget * n;

    /* places ranked by distance from the office */
    var ranked = Object.keys(DATA.locs).map(function (id) {
      var inPlan = chosen.filter(function (s) { return s.loc === id; });
      return { id: id, name: DATA.locs[id].name, km: leg("office", id).km, min: leg("office", id).min, inPlan: inPlan.map(function (s) { return s.title; }), jeep: DATA.locs[id].offroad > 0 };
    }).sort(function (a, b) { return a.km - b.km; });

    return { f: f, n: n, days: days, cl: cl, sunset: sunset, sched: sched, opts: opts, rec: rec, hotel: hotel, costs: costs, sub: sub, cont: cont, total: total, perPerson: perPerson, budget: budget, warn: warn, ranked: ranked, totalKm: totalKm, jeepDays: jeepDays };
  }

  /* ---------- outputs ---------- */
  function bring(p) {
    var b = ["Comfortable shoes for sand", "Hat, sunglasses and sunscreen", "Water bottle", "Power bank", "National ID", "Some cash for extras"];
    if (p.cl[1] <= 12) b.unshift("A warm jacket: mornings and evenings are about " + p.cl[1] + "°C");
    else if (p.cl[1] <= 16) b.unshift("A light jacket for the evening");
    if (p.days > 1) b.push("Overnight bag, toothbrush and a change of clothes");
    if (p.f.stops.indexOf("desert") > -1) b.push("Clothes you don't mind getting sandy");
    return b;
  }
  function fmtDate(d) { return new Date(d + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); }
  function message(p) {
    var f = p.f, stops = p.sched.map(function (r) { return r.filter(function (x) { return x.stop; }).map(function (x) { return x.stop.title; }).join(" → "); }).join("  |  Day 2: ");
    var back = p.sched[p.sched.length - 1].filter(function (x) { return x.end; })[0];
    return [
      (f.name || "Fayoum Trip") + " – " + fmtDate(f.date) + (p.days > 1 ? " (2 days)" : "") + " 🌿",
      "",
      "Meeting point: Company office",
      "Gather: " + hm(toMin(f.gather)) + " sharp (we leave 15 minutes later)",
      "Back at the office: around " + (back ? hm(back.t) : hm(toMin(f.backBy))),
      "",
      "Plan: " + (p.days > 1 ? "Day 1: " : "") + stops,
      "",
      "Bring: " + bring(p).map(function (x) { x = x.split(":")[0]; return x.charAt(0).toLowerCase() + x.slice(1); }).join(", ") + ".",
      "",
      "Cost: " + num(p.perPerson) + " EGP per person" + (p.days > 1 ? " (transport, food, tickets and the night's stay)" : " (transport, food and tickets)") + ".",
      f.deadline ? "Please register and pay HR by " + new Date(f.deadline + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) + "." : "",
      "",
      "Questions? Contact the HR team. See you there!"
    ].filter(function (l, i, a) { return !(l === "" && a[i - 1] === ""); }).join("\n");
  }
  function program(p) {
    var out = [];
    p.sched.forEach(function (rows, d) {
      rows.forEach(function (r) {
        if (r.end) return;
        out.push({ title: (p.days > 1 ? "Day " + (d + 1) + ": " : "") + r.title, text: r.text, time: hm(r.t), scene: r.scene });
      });
    });
    return out;
  }

  /* ---------- UI ---------- */
  var CSS = ".pl{display:grid;grid-template-columns:minmax(0,1fr);gap:14px;margin-top:16px}.pl>*,.pl .two2>*,.pl .kpi{min-width:0}.pl .cardx h4{margin-bottom:2px}"
    + "@media(max-width:520px){.pl .kpi{padding:10px 12px}.pl .kpi b{font-size:28px}.pl .kpi span{font-size:10px;letter-spacing:.08em}}"
    + "@media(max-width:600px){.seg{display:grid;grid-template-columns:1fr 1fr}.seg button{border-top:1px solid #cfcfd0}.seg button:nth-child(-n+2){border-top:0}.seg button:nth-child(odd){border-left:0}}"
    + ".plf{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}.plf .field{margin:0}"
    + ".plchk{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:4px 16px;margin-top:4px}.plchk .chk{margin:6px 0}"
    + ".plchk small{display:block;color:#77777a;font-size:12px}"
    + ".plbtns{display:flex;flex-wrap:wrap;gap:10px;margin-top:6px}"
    + ".plwarn{background:#FFF3CD;border:1px solid #f0d98a;color:#7a5b00;font-size:14px;padding:10px 14px}.plwarn div+div{margin-top:4px}"
    + ".plsample{font-size:12px;color:#77777a}"
    + ".plday{font:500 12px 'Roboto',Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--red);margin:14px 0 4px}"
    + ".pl .tbl td:first-child{white-space:nowrap}.pl .tbl td.w{white-space:normal}.pl .tbl td.r,.pl .tbl th.r{text-align:right}"
    + ".pl .tbl tr.rec td{background:#f2f8ff}.pl .tbl tr.tot td{font-weight:700;border-top:2px solid var(--k90)}"
    + ".plmsg{width:100%;min-height:260px;font:400 14px/1.45 'Roboto',Arial,sans-serif;padding:12px;border:1px solid #cfcfd0;border-radius:2px;resize:vertical}"
    + ".plok{color:#2a7a4a}.plbad{color:var(--red)}"
    + ".plul{margin:4px 0 0 18px;font-size:14px}.plul li{margin:3px 0}"
    + "@media(min-width:900px){.pl .two2{display:grid;grid-template-columns:1fr 1fr;gap:14px}}";

  function form(defs) {
    var stopsHtml = DATA.stops.map(function (s) {
      return '<label class="chk"><input type="checkbox" name="plStop" value="' + s.id + '"' + (defs.stops.indexOf(s.id) > -1 ? " checked" : "") + '><span>' + esc(s.title)
        + '<small>' + esc(s.hours + " h" + (s.jeep ? " · needs 4x4 jeeps" : "") + (s.twoDay ? " · best on 2 days" : "") + (s.slot === 3 ? " · at sunset" : s.slot === 4 ? " · evening" : "")) + '</small></span></label>';
    }).join("");
    return '<div class="cardx"><h4>Plan a trip</h4><div class="sub">Fill in the trip and get a full plan: schedule, places, transport, food, budget per person and a ready message. Prices are <b>samples</b>: confirm them before booking.</div>'
      + '<div class="plf">'
      + '<div class="field"><label class="lab" for="plName">Trip name</label><input class="inp" id="plName" value="' + esc(defs.name) + '"></div>'
      + '<div class="field"><label class="lab" for="plPlace">Destination</label><select class="inp" id="plPlace"><option>Fayoum</option></select></div>'
      + '<div class="field"><label class="lab" for="plDate">Trip date</label><input class="inp" id="plDate" type="date" value="' + esc(defs.date) + '"></div>'
      + '<div class="field"><label class="lab" for="plDays">Days</label><select class="inp" id="plDays"><option value="1">1 day</option><option value="2">2 days (1 night)</option></select></div>'
      + '<div class="field"><label class="lab" for="plPeople">People</label><input class="inp" id="plPeople" type="number" min="1" max="200" value="' + defs.people + '"><div style="font-size:12px;color:#77777a;margin-top:4px"><a href="#" id="plUseReg">Use registrations (' + defs.reg + ')</a></div></div>'
      + '<div class="field"><label class="lab" for="plBudget">Budget per person (EGP)</label><input class="inp" id="plBudget" type="number" min="0" step="50" value="' + defs.budget + '"></div>'
      + '<div class="field"><label class="lab" for="plGather">Gather at</label><input class="inp" id="plGather" type="time" value="' + defs.gather + '"></div>'
      + '<div class="field"><label class="lab" for="plBack">Back by</label><input class="inp" id="plBack" type="time" value="22:00"></div>'
      + '<div class="field"><label class="lab" for="plBf">Breakfast</label><select class="inp" id="plBf"><option value="road">Stop on the road</option><option value="tunis">Fiteer in Tunis Village</option><option value="packed">Packed boxes on the bus</option><option value="none">None</option></select></div>'
      + '<div class="field"><label class="lab" for="plDl">Register &amp; pay by</label><input class="inp" id="plDl" type="date" value="' + esc(defs.deadline) + '"></div>'
      + '<div class="field" id="plHotelF" style="display:none"><label class="lab" for="plHotel">Overnight stay</label><select class="inp" id="plHotel"><option value="auto">Closest to day 1</option>' + DATA.hotels.map(function (h) { return '<option value="' + h.id + '">' + esc(h.name) + '</option>'; }).join("") + '</select></div>'
      + '</div>'
      + '<div class="lab" style="margin-top:16px">Places to visit</div><div class="plchk">' + stopsHtml + '</div>'
      + '<div class="plchk"><label class="chk"><input type="checkbox" id="plPottery"><span>Pottery workshop in Tunis Village<small>+' + DATA.pottery + ' EGP per person</small></span></label>'
      + '<label class="chk"><input type="checkbox" id="plDinner"><span>Dinner before heading home<small>at the last stop</small></span></label></div>'
      + '<div class="plbtns"><button class="btn" id="plGo" type="button">Make the plan</button></div></div>'
      + '<div id="plOut"></div>';
  }

  function render(p) {
    var out = $("plOut");
    if (p.error) { out.innerHTML = '<div class="plwarn">' + esc(p.error) + '</div>'; return; }
    var ok = p.total <= p.budget, diff = Math.abs(p.budget - p.total);
    var back = p.sched[p.sched.length - 1].filter(function (x) { return x.end; })[0];
    var kpi = '<div class="kpis">'
      + '<div class="kpi"><b>' + num(p.perPerson) + '</b><span>EGP per person</span><small>amount to collect</small></div>'
      + '<div class="kpi"><b>' + num(p.total) + '</b><span>Total EGP</span><small>incl. 10% extra for surprises</small></div>'
      + '<div class="kpi"><b class="' + (ok ? "plok" : "plbad") + '">' + (ok ? "Within" : "Over") + '</b><span>Budget</span><small>' + (ok ? num(diff) + " EGP left" : num(diff) + " EGP over") + ' of ' + num(p.budget) + '</small></div>'
      + '<div class="kpi"><b>' + (back ? hm(back.t) : "-") + '</b><span>Back at office</span><small>' + num(p.totalKm) + ' km driving</small></div></div>';

    var warn = p.warn.length ? '<div class="plwarn">' + p.warn.map(function (w) { return "<div>⚠️ " + esc(w) + "</div>"; }).join("") + '</div>' : "";

    var sched = p.sched.map(function (rows, d) {
      return (p.days > 1 ? '<div class="plday">Day ' + (d + 1) + '</div>' : "") + '<div class="tblw"><table class="tbl"><thead><tr><th>Time</th><th>What</th><th>Drive</th></tr></thead><tbody>'
        + rows.map(function (r) { return '<tr><td>' + hm(r.t) + '</td><td class="w"><b>' + esc(r.title) + '</b>' + (r.text ? '<br><span style="color:#77777a;font-size:13px">' + esc(r.text) + '</span>' : "") + '</td><td>' + (r.drive && r.drive.km ? r.drive.km + " km · " + r.drive.min + " min" : "") + '</td></tr>'; }).join("")
        + '</tbody></table></div>';
    }).join("");

    var places = '<div class="tblw"><table class="tbl"><thead><tr><th>#</th><th>Place</th><th class="r">From office</th><th>In the plan</th></tr></thead><tbody>'
      + p.ranked.map(function (r, i) { return '<tr><td>' + (i + 1) + '</td><td class="w">' + esc(r.name) + (r.jeep ? ' <span class="plsample">(4x4)</span>' : "") + '</td><td class="r">' + r.km + ' km · ' + Math.round(r.min / 6) / 10 + ' h</td><td class="w">' + (r.inPlan.length ? "✅ " + esc(r.inPlan.join(", ")) : '<span class="plsample">Not included</span>') + '</td></tr>'; }).join("")
      + '</tbody></table></div>';

    var trans = '<div class="tblw"><table class="tbl"><thead><tr><th>Option</th><th class="r">Vehicles</th><th class="r">Total</th><th class="r">Per person</th><th>Note</th></tr></thead><tbody>'
      + p.opts.map(function (o) { return '<tr class="' + (o.rec ? "rec" : "") + '"><td class="w">' + (o.rec ? "⭐ " : "") + esc(o.name) + '</td><td class="r">' + o.cnt + '</td><td class="r">' + num(o.total) + '</td><td class="r">' + num(Math.ceil(o.total / p.n)) + '</td><td class="w">' + esc(o.note) + '</td></tr>'; }).join("")
      + '</tbody></table></div><div class="sub" style="margin:8px 0 0">⭐ Recommended: the smallest vehicle that fits everyone together.' + (p.jeepDays ? " Plus 4x4 jeeps for the desert part." : "") + '</div>';

    var food = p.costs.filter(function (c) { return c.cat === "food" || c.cat === "stay"; }).map(function (c) { return "<li>" + esc(c.label) + " · " + egp(c.total / (c.cat === "food" ? p.n : 1)) + (c.cat === "food" ? " per person" : " in total") + "</li>"; }).join("");
    var hotels = p.hotel ? '<div class="sub" style="margin:10px 0 4px">Stay options for ' + p.n + ' people (one night)</div><ul class="plul">' + p.hotel.all.map(function (h) { return "<li>" + (h === p.hotel ? "⭐ " : "") + esc(h.h.name) + ": " + esc(h.rooms) + " · " + egp(h.cost) + "</li>"; }).join("") + "</ul>" : "";

    var cats = {}; p.costs.forEach(function (c) { cats[c.cat] = (cats[c.cat] || 0) + c.total; });
    var NAMES = { transport: "Transport", tickets: "Tickets", food: "Food", activities: "Activities", stay: "Stay" };
    var budget = '<div class="tblw"><table class="tbl"><thead><tr><th>Item</th><th class="r">Total</th><th class="r">Per person</th></tr></thead><tbody>'
      + p.costs.map(function (c) { return '<tr><td class="w">' + esc(c.label) + ' <span class="plsample">' + esc(NAMES[c.cat]) + '</span></td><td class="r">' + num(c.total) + '</td><td class="r">' + num(c.total / p.n) + '</td></tr>'; }).join("")
      + '<tr><td class="w">Extra for surprises (10%)</td><td class="r">' + num(p.cont) + '</td><td class="r">' + num(p.cont / p.n) + '</td></tr>'
      + '<tr class="tot"><td>Total</td><td class="r">' + num(p.total) + '</td><td class="r">' + num(p.total / p.n) + '</td></tr>'
      + '</tbody></table></div><div class="sub" style="margin:8px 0 0">' + Object.keys(cats).map(function (k) { return NAMES[k] + " " + num(cats[k]); }).join(" · ") + ' · Collect <b>' + num(p.perPerson) + ' EGP</b> per person (rounded up).</div>';

    out.innerHTML = '<div class="pl">'
      + '<div class="cardx"><h4>' + esc(p.f.name || "Trip") + '</h4><div class="sub">' + esc(fmtDate(p.f.date)) + ' · ' + p.n + ' people · ' + (p.days > 1 ? "2 days" : "1 day") + ' · weather about ' + p.cl[0] + '°C by day, ' + p.cl[1] + '°C at night, sunset ' + hm(p.sunset) + ' (monthly averages)</div>' + kpi + '</div>'
      + warn
      + '<div class="cardx"><h4>Schedule</h4>' + sched + '</div>'
      + '<div class="two2"><div class="cardx"><h4>Places by distance</h4><div class="sub">Ranked from the company office</div>' + places + '</div>'
      + '<div class="cardx"><h4>Transport</h4><div class="sub">For ' + p.n + ' people, about ' + num(p.totalKm) + ' km</div>' + trans + '</div></div>'
      + '<div class="two2"><div class="cardx"><h4>Food &amp; stay</h4><ul class="plul">' + food + '</ul>' + hotels + '</div>'
      + '<div class="cardx"><h4>What to bring</h4><ul class="plul">' + bring(p).map(function (b) { return "<li>" + esc(b) + "</li>"; }).join("") + '</ul></div></div>'
      + '<div class="cardx"><h4>Budget</h4><div class="sub">Sample prices: confirm with suppliers before booking</div>' + budget + '</div>'
      + '<div class="cardx"><h4>Group message</h4><div class="sub">Draft only. Nothing is sent: copy it into WhatsApp or email yourself.</div><textarea class="plmsg" id="plMsg">' + esc(message(p)) + '</textarea>'
      + '<div class="plbtns"><button class="btn" id="plCopy" type="button">Copy message</button><button class="btn dark" id="plNewEv" type="button">Create event from this plan</button><button class="btn ghost" id="plUpdEv" type="button">Fill the selected event with this plan</button></div>'
      + '<div class="plsample" style="margin-top:8px">The event buttons only open the event form with the plan filled in. Check it, then click <b>Save event</b>. Nothing changes until you do.</div></div>'
      + '</div>';

    $("plCopy").onclick = function () {
      var t = $("plMsg"); t.select();
      var done = function () { window.HRBridge.toast("Message copied"); };
      try { navigator.clipboard.writeText(t.value).then(done, function () { document.execCommand("copy"); done(); }); } catch (e) { try { document.execCommand("copy"); done(); } catch (_) { window.HRBridge.toast("Select the text and copy it", true); } }
    };
    function prefill() {
      var dl = p.f.deadline ? p.f.deadline + "T23:59" : "";
      return { date: p.f.date + "T" + p.f.gather, deadline: dl, location: "Fayoum · " + p.ranked.filter(function (r) { return r.inPlan.length; }).map(function (r) { return r.name; }).join(", "), cost: num(p.perPerson) + " EGP per person", program: program(p), theme: "desert" };
    }
    $("plNewEv").onclick = function () { var x = prefill(); x.name = p.f.name; window.HRBridge.openEvent("", x); };
    var cur = window.HRBridge.currentEvent();
    if (!cur) $("plUpdEv").style.display = "none";
    else { $("plUpdEv").textContent = "Fill “" + cur.name + "” with this plan"; $("plUpdEv").onclick = function () { window.HRBridge.openEvent(cur.id, prefill()); }; }
    out.scrollIntoView && out.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function readForm() {
    return {
      name: $("plName").value.trim(), date: $("plDate").value, days: +$("plDays").value, people: Math.max(1, +$("plPeople").value || 1),
      budget: Math.max(0, +$("plBudget").value || 0), gather: $("plGather").value || "07:00", backBy: $("plBack").value || "22:00",
      breakfast: $("plBf").value, deadline: $("plDl").value, hotel: $("plHotel").value, pottery: $("plPottery").checked, dinner: $("plDinner").checked,
      stops: Array.prototype.slice.call(document.querySelectorAll('input[name="plStop"]:checked')).map(function (x) { return x.value; })
    };
  }

  function mount(box) {
    if (!document.getElementById("plCss")) { var st = document.createElement("style"); st.id = "plCss"; st.textContent = CSS; document.head.appendChild(st); }
    var ev = window.HRBridge.currentEvent(), reg = window.HRBridge.headcount();
    var date = ev && ev.date ? String(ev.date).slice(0, 10) : new Date(Date.now() + 21 * 864e5).toISOString().slice(0, 10);
    var gather = "07:00";
    if (ev && ev.date && String(ev.date).length > 10) { var dt = new Date(ev.date); if (!isNaN(dt)) { date = dt.toLocaleDateString("en-CA"); gather = dt.toTimeString().slice(0, 5); } }
    var dl = new Date(new Date(date + "T12:00:00").getTime() - 4 * 864e5).toISOString().slice(0, 10);
    box.innerHTML = form({ name: ev ? ev.name : "Fayoum Trip", date: date, people: reg || 10, reg: reg, budget: 2500, gather: gather, deadline: dl, stops: DATA.stops.filter(function (s) { return s.def; }).map(function (s) { return s.id; }) });
    $("plDays").onchange = function () { $("plHotelF").style.display = this.value === "2" ? "" : "none"; };
    $("plUseReg").onclick = function (e) { e.preventDefault(); var r = window.HRBridge.headcount(); if (r) $("plPeople").value = r; else window.HRBridge.toast("No confirmed registrations for this event yet", true); };
    $("plGo").onclick = function () {
      var f = readForm();
      if (!f.date) { window.HRBridge.toast("Please pick the trip date", true); return; }
      render(build(f));
    };
  }

  /* add the styles right away (the tab button row needs them on small screens) */
  (function () { var st = document.createElement("style"); st.id = "plCss"; st.textContent = CSS; document.head.appendChild(st); })();

  window.TripPlanner = { mount: mount, build: build, _data: DATA };
})();

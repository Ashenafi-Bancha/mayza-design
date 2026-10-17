// Mayza Admin: orders, products and website settings for the Mayza Design team.
(() => {
  const S = window.MayzaStore;
  const root = document.getElementById("root");
  const drawerWrap = document.getElementById("drawer");
  const drawer = drawerWrap.querySelector(".drawer");
  const toastEl = document.getElementById("toast");

  // ---------- language ----------
  let lang = "en";
  try { lang = localStorage.getItem("mayza-admin-lang") || localStorage.getItem("mayza-lang") || "en"; } catch (e) {}

  const T = {
    en: {
      appName: "Mayza Admin", admin: "Admin",
      signInTitle: "Sign in to manage Mayza Design", email: "Email", password: "Password", signIn: "Sign in", signingIn: "Signing in…",
      forgotHint: "Forgot your password? Ask your developer to reset it.",
      artTitle: "Your orders, products and website in one place.", artText: "Every order placed on the website lands here. Update your collection and contact details yourself, from your phone or computer.",
      demoTitle: "Try the admin", demoText: "No database is connected yet, so the admin runs in demo mode. Everything you change stays in this browser.", openDemo: "Open the demo",
      demoSetup: "Connecting the real database is a one-time setup done by your developer.",
      demoBanner: "Demo mode: changes stay in this browser. Open the website in another tab, add an order on the Custom orders page, and watch it arrive here.",
      dashboard: "Overview", orders: "Orders", products: "Products", settings: "Settings",
      viewSite: "View website", signOut: "Sign out",
      hello: "Selam, welcome back", today: "Today is {date}",
      statNew: "New orders", statWork: "In the workshop", statReady: "Ready for pickup", statLive: "Products on the website",
      valueActive: "Value of open orders", deposits: "Deposits received", toCollect: "Still to collect",
      attention: "Needs attention", attentionEmpty: "Nothing urgent. New orders and close deadlines will show here.",
      recent: "Latest orders", seeAll: "See all orders", quick: "Quick actions",
      addOrder: "Add an order", addOrderHint: "For phone calls and walk-in customers", addProduct: "Add a product", addProductHint: "Photo, name and price", editAnnounce: "Post an announcement", editAnnounceHint: "A message across the top of the website",
      new: "New", confirmed: "Confirmed", in_progress: "In progress", ready: "Ready", delivered: "Delivered", cancelled: "Cancelled", all: "All",
      search: "Search name, phone or reference", exportCsv: "Export (CSV)",
      noOrders: "No orders here yet. Orders placed on the website appear here straight away.", noMatch: "No orders match this search.",
      overdue: "Overdue {n}d", dueToday: "Due today", dueIn: "In {n} days", noDate: "No date",
      priceTbd: "Price not set", newOrder: "New order", order: "Order",
      customer: "Customer", name: "Full name", phone: "Phone", garment: "Garment", who: "For", neededBy: "Needed by", product: "Product", none: "None", choose: "Choose",
      measurements: "Measurements (cm)", chest: "Chest", waist: "Waist", hip: "Hip", height: "Height", custNotes: "Customer's notes",
      work: "Workshop", status: "Status", price: "Agreed price (ETB)", deposit: "Deposit paid (ETB)", balance: "Balance", paidFull: "Paid in full",
      adminNotes: "Private notes", adminNotesHint: "Only your team sees these.",
      source: "Came from", website: "Website", phoneSrc: "Phone call", "walk-in": "Walk-in", social: "Social media",
      g_cultural: "Cultural wear", g_modern: "Modern fashion", g_street: "Streetwear", g_group: "Group order", g_other: "Something else",
      w_woman: "Woman", w_man: "Man", w_child: "Child", w_couple: "Couple", w_family: "Family",
      l_cultural: "Cultural wear", l_modern: "Modern fashion", l_streetwear: "Streetwear", l_children: "Children",
      call: "Call", whatsapp: "WhatsApp", save: "Save", saving: "Saving…", saved: "Saved", close: "Close", delete: "Delete", yesDelete: "Yes, delete", cancel: "Cancel", deleted: "Deleted",
      placed: "Placed {when}", waGreeting: "Hello {name}, this is Mayza Design about your order {ref}.",
      needNamePhone: "Add the customer's name and phone number.", newOrderToast: "New order from {name}",
      productsIntro: "Visible products appear on the Collections page, featured ones first, then by position.",
      noProducts: "No products yet. Add your first piece with a photo.", featured: "Featured", hidden: "Hidden", onSite: "On website",
      visible: "Show on the website", featuredLabel: "Mark as featured", featuredHint: "Featured pieces come first and carry a badge.",
      photo: "Photo", choosePhoto: "Tap to choose a photo", changePhoto: "Change photo", photoHint: "JPG or PNG. Large photos are resized automatically.", uploading: "Uploading photo…",
      nameEn: "Name in English", nameAm: "Name in Amharic", descEn: "Description in English", descAm: "Description in Amharic",
      line: "Collection", priceOpt: "Price in ETB", priceOptHint: "Leave empty to show “price on request”.", position: "Position", positionHint: "Lower numbers show first.",
      needProductName: "Add an English name for the product.", needPhoto: "Add a photo so customers can see the piece.",
      editProduct: "Edit product", newProduct: "New product", edit: "Edit", priceRequest: "Price on request",
      contact: "Contact numbers", contactHint: "These update every call, WhatsApp and Telegram button on the website.",
      phoneMain: "Main phone", phone2: "Second phone", whatsappNum: "WhatsApp number", telegramVal: "Telegram number or username",
      location: "Location and hours", addressEn: "Address in English", addressAm: "Address in Amharic", hoursEn: "Opening hours in English", hoursAm: "Opening hours in Amharic",
      socialLinks: "Social media links", stats: "Follower numbers", statsHint: "Shown on the Home and About pages, for example 82K.",
      statFb: "Facebook followers", statTt: "TikTok followers", statLikes: "TikTok likes",
      announce: "Announcement bar", announceHint: "A short line across the top of every page: a new collection, a holiday offer or a closing day.",
      announceOn: "Show the announcement", announceEn: "Message in English", announceAm: "Message in Amharic", preview: "Preview",
      saveSettings: "Save settings", settingsSaved: "Saved. The website now shows the new details.",
      account: "Account", currentPassword: "Current password", newPassword: "New password", changePassword: "Change password", pwShort: "Use at least 8 characters.", pwChanged: "Password changed.",
      demoData: "Demo data", resetDemo: "Reset the demo", resetDemoHint: "Puts back the sample orders and the original collection.", demoReset: "Demo reset.",
      loadFail: "Could not load the data: {msg}", retry: "Try again", recovery: "Choose a new password",
      ordersCount: "{n} orders", csvName: "mayza-orders",
    },
    am: {
      appName: "ማይዛ አስተዳደር", admin: "አስተዳደር",
      signInTitle: "ማይዛ ዲዛይንን ለማስተዳደር ይግቡ", email: "ኢሜይል", password: "የይለፍ ቃል", signIn: "ግባ", signingIn: "በመግባት ላይ…",
      forgotHint: "የይለፍ ቃል ረሱ? ዴቨሎፐርዎ እንዲቀይርልዎ ይጠይቁ።",
      artTitle: "ትዕዛዞች፣ ምርቶች እና ድረ-ገጽዎ በአንድ ቦታ።", artText: "በድረ-ገጹ የሚገባ እያንዳንዱ ትዕዛዝ እዚህ ይደርሳል። ስብስብዎንና የመገናኛ መረጃዎን ከስልክዎ ወይም ከኮምፒውተርዎ ራስዎ ያስተካክሉ።",
      demoTitle: "አስተዳደሩን ይሞክሩ", demoText: "ገና ዳታቤዝ ስላልተገናኘ አስተዳደሩ በሙከራ ሁኔታ ይሰራል። የሚቀይሩት ሁሉ በዚህ ብራውዘር ውስጥ ብቻ ይቀመጣል።", openDemo: "ሙከራውን ክፈት",
      demoSetup: "ትክክለኛውን ዳታቤዝ ማገናኘት በዴቨሎፐርዎ አንድ ጊዜ የሚሰራ ስራ ነው።",
      demoBanner: "የሙከራ ሁኔታ፦ ለውጦች በዚህ ብራውዘር ብቻ ይቀመጣሉ። ድረ-ገጹን በሌላ ታብ ከፍተው በልዩ ትዕዛዝ ገጽ ትዕዛዝ ቢያስገቡ እዚህ ሲደርስ ያያሉ።",
      dashboard: "አጠቃላይ እይታ", orders: "ትዕዛዞች", products: "ምርቶች", settings: "ማስተካከያ",
      viewSite: "ድረ-ገጹን ይመልከቱ", signOut: "ውጣ",
      hello: "ሰላም፣ እንኳን ደህና መጡ", today: "ዛሬ {date} ነው",
      statNew: "አዲስ ትዕዛዞች", statWork: "በስራ ላይ", statReady: "ለመረከብ ዝግጁ", statLive: "በድረ-ገጹ ያሉ ምርቶች",
      valueActive: "የክፍት ትዕዛዞች ዋጋ", deposits: "የተቀበሉት ቅድሚያ ክፍያ", toCollect: "የሚቀረው ክፍያ",
      attention: "ትኩረት የሚፈልጉ", attentionEmpty: "አስቸኳይ ነገር የለም። አዲስ ትዕዛዞችና የቀረቡ ቀናት እዚህ ይታያሉ።",
      recent: "የቅርብ ትዕዛዞች", seeAll: "ሁሉንም ትዕዛዞች ይመልከቱ", quick: "ፈጣን ተግባራት",
      addOrder: "ትዕዛዝ ጨምር", addOrderHint: "በስልክ ወይም በአካል ለመጡ ደንበኞች", addProduct: "ምርት ጨምር", addProductHint: "ፎቶ፣ ስም እና ዋጋ", editAnnounce: "ማስታወቂያ ለጥፍ", editAnnounceHint: "በድረ-ገጹ አናት ላይ የሚታይ መልዕክት",
      new: "አዲስ", confirmed: "ተረጋግጧል", in_progress: "በስራ ላይ", ready: "ዝግጁ", delivered: "ተረክቧል", cancelled: "ተሰርዟል", all: "ሁሉም",
      search: "በስም፣ በስልክ ወይም በመለያ ቁጥር ይፈልጉ", exportCsv: "ወደ ኤክሴል (CSV)",
      noOrders: "እዚህ ገና ትዕዛዝ የለም። በድረ-ገጹ የሚገቡ ትዕዛዞች ወዲያውኑ እዚህ ይታያሉ።", noMatch: "ከፍለጋው ጋር የሚመሳሰል ትዕዛዝ የለም።",
      overdue: "{n} ቀን አልፏል", dueToday: "ዛሬ ይደርሳል", dueIn: "በ{n} ቀን", noDate: "ቀን የለም",
      priceTbd: "ዋጋ አልተወሰነም", newOrder: "አዲስ ትዕዛዝ", order: "ትዕዛዝ",
      customer: "ደንበኛ", name: "ሙሉ ስም", phone: "ስልክ", garment: "የልብስ ዓይነት", who: "ለማን", neededBy: "የሚፈለግበት ቀን", product: "ምርት", none: "የለም", choose: "ይምረጡ",
      measurements: "ልኬት (ሴ.ሜ)", chest: "ደረት", waist: "ወገብ", hip: "ዳሌ", height: "ቁመት", custNotes: "የደንበኛው ማስታወሻ",
      work: "የስራ ሂደት", status: "ሁኔታ", price: "የተስማሙበት ዋጋ (ብር)", deposit: "የተከፈለ ቅድሚያ (ብር)", balance: "ቀሪ ክፍያ", paidFull: "ሙሉ በሙሉ ተከፍሏል",
      adminNotes: "የግል ማስታወሻ", adminNotesHint: "የእርስዎ ቡድን ብቻ ያየዋል።",
      source: "የመጣበት", website: "ድረ-ገጽ", phoneSrc: "ስልክ", "walk-in": "በአካል", social: "ማህበራዊ ሚዲያ",
      g_cultural: "ባህላዊ ልብስ", g_modern: "ዘመናዊ ልብስ", g_street: "ስትሪትዌር", g_group: "የቡድን ትዕዛዝ", g_other: "ሌላ",
      w_woman: "ሴት", w_man: "ወንድ", w_child: "ልጅ", w_couple: "ጥንዶች", w_family: "ቤተሰብ",
      l_cultural: "ባህላዊ አልባሳት", l_modern: "ዘመናዊ ፋሽን", l_streetwear: "ስትሪትዌር", l_children: "ልጆች",
      call: "ደውል", whatsapp: "ዋትስአፕ", save: "አስቀምጥ", saving: "በማስቀመጥ ላይ…", saved: "ተቀምጧል", close: "ዝጋ", delete: "ሰርዝ", yesDelete: "አዎ፣ ሰርዝ", cancel: "ተው", deleted: "ተሰርዟል",
      placed: "የገባው {when}", waGreeting: "ሰላም {name}፣ ከማይዛ ዲዛይን ነን፤ ስለ ትዕዛዝዎ {ref} ነው።",
      needNamePhone: "የደንበኛውን ስምና ስልክ ያስገቡ።", newOrderToast: "ከ{name} አዲስ ትዕዛዝ ገብቷል",
      productsIntro: "የሚታዩ ምርቶች በስብስቦች ገጽ ላይ ይወጣሉ፤ ተመራጮቹ ቀድመው፣ ከዚያ በቅደም ተከተላቸው።",
      noProducts: "ገና ምርት የለም። የመጀመሪያውን በፎቶ ይጨምሩ።", featured: "ተመራጭ", hidden: "ተደብቋል", onSite: "በድረ-ገጹ",
      visible: "በድረ-ገጹ ላይ አሳይ", featuredLabel: "ተመራጭ አድርግ", featuredHint: "ተመራጭ ምርቶች ቀድመው ይታያሉ፣ ምልክትም ይኖራቸዋል።",
      photo: "ፎቶ", choosePhoto: "ፎቶ ለመምረጥ ይጫኑ", changePhoto: "ፎቶ ቀይር", photoHint: "JPG ወይም PNG። ትልልቅ ፎቶዎች በራሳቸው ይስተካከላሉ።", uploading: "ፎቶ በመጫን ላይ…",
      nameEn: "ስም በእንግሊዝኛ", nameAm: "ስም በአማርኛ", descEn: "መግለጫ በእንግሊዝኛ", descAm: "መግለጫ በአማርኛ",
      line: "ስብስብ", priceOpt: "ዋጋ በብር", priceOptHint: "ባዶ ከተተወ «ዋጋ ይጠይቁ» ይታያል።", position: "ቅደም ተከተል", positionHint: "ትንሽ ቁጥር ቀድሞ ይታያል።",
      needProductName: "የምርቱን የእንግሊዝኛ ስም ያስገቡ።", needPhoto: "ደንበኞች እንዲያዩት ፎቶ ይጨምሩ።",
      editProduct: "ምርት አስተካክል", newProduct: "አዲስ ምርት", edit: "አስተካክል", priceRequest: "ዋጋ ይጠይቁ",
      contact: "የመገናኛ ቁጥሮች", contactHint: "እነዚህ በድረ-ገጹ ላይ ያሉትን የመደወያ፣ የዋትስአፕ እና የቴሌግራም ቁልፎች ሁሉ ይቀይራሉ።",
      phoneMain: "ዋና ስልክ", phone2: "ሁለተኛ ስልክ", whatsappNum: "የዋትስአፕ ቁጥር", telegramVal: "የቴሌግራም ቁጥር ወይም ስም",
      location: "አድራሻ እና የስራ ሰዓት", addressEn: "አድራሻ በእንግሊዝኛ", addressAm: "አድራሻ በአማርኛ", hoursEn: "የስራ ሰዓት በእንግሊዝኛ", hoursAm: "የስራ ሰዓት በአማርኛ",
      socialLinks: "የማህበራዊ ሚዲያ ሊንኮች", stats: "የተከታዮች ብዛት", statsHint: "በመነሻ እና ስለ እኛ ገጾች ላይ ይታያሉ፤ ለምሳሌ 82K።",
      statFb: "የፌስቡክ ተከታዮች", statTt: "የቲክቶክ ተከታዮች", statLikes: "የቲክቶክ መውደዶች",
      announce: "የማስታወቂያ መስመር", announceHint: "በእያንዳንዱ ገጽ አናት ላይ የሚታይ አጭር መልዕክት፤ ለአዲስ ስብስብ፣ ለበዓል ቅናሽ ወይም ለዝግ ቀን።",
      announceOn: "ማስታወቂያውን አሳይ", announceEn: "መልዕክት በእንግሊዝኛ", announceAm: "መልዕክት በአማርኛ", preview: "ቅድመ እይታ",
      saveSettings: "ማስተካከያውን አስቀምጥ", settingsSaved: "ተቀምጧል። ድረ-ገጹ አዲሱን መረጃ ያሳያል።",
      account: "መለያ", currentPassword: "የአሁኑ የይለፍ ቃል", newPassword: "አዲስ የይለፍ ቃል", changePassword: "የይለፍ ቃል ቀይር", pwShort: "ቢያንስ 8 ፊደል ይጠቀሙ።", pwChanged: "የይለፍ ቃሉ ተቀይሯል።",
      demoData: "የሙከራ መረጃ", resetDemo: "ሙከራውን እንደ አዲስ ጀምር", resetDemoHint: "የናሙና ትዕዛዞችንና የመጀመሪያውን ስብስብ ይመልሳል።", demoReset: "ሙከራው እንደ አዲስ ተጀምሯል።",
      loadFail: "መረጃውን መጫን አልተቻለም፦ {msg}", retry: "እንደገና ሞክር", recovery: "አዲስ የይለፍ ቃል ይምረጡ",
      ordersCount: "{n} ትዕዛዞች", csvName: "mayza-orders",
    },
  };
  const t = (k, v = {}) => String(T[lang][k] ?? T.en[k] ?? k).replace(/\{(\w+)\}/g, (_, x) => (v[x] ?? ""));

  // ---------- constants and helpers ----------
  const STATUSES = ["new", "confirmed", "in_progress", "ready", "delivered", "cancelled"];
  const OPEN = ["new", "confirmed", "in_progress", "ready"];
  const GARMENTS = ["cultural", "modern", "street", "group", "other"];
  const WHOS = ["woman", "man", "child", "couple", "family"];
  const LINES = ["cultural", "modern", "streetwear", "children"];
  const SOURCES = ["website", "phone", "walk-in", "social"];
  const srcLabel = (s) => t(s === "phone" ? "phoneSrc" : s);

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const imgUrl = (u) => S.resolveImage(u, "../");
  const locale = () => (lang === "am" ? "am-ET" : "en-GB");
  const num = (n) => new Intl.NumberFormat("en-US").format(Math.round(Number(n) || 0));
  const money = (n) => (lang === "am" ? `${num(n)} ብር` : `ETB ${num(n)}`);
  const parseDay = (s) => { if (!s) return null; const [y, m, d] = String(s).slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d); };
  const fmtDay = (s) => { const d = parseDay(s); return d ? d.toLocaleDateString(locale(), { day: "numeric", month: "short", year: "numeric" }) : ""; };
  const ago = (iso) => {
    const diff = (new Date(iso) - Date.now()) / 1000;
    const rtf = new Intl.RelativeTimeFormat(lang === "am" ? "am" : "en", { numeric: "auto" });
    const units = [["day", 86400], ["hour", 3600], ["minute", 60]];
    for (const [u, s] of units) if (Math.abs(diff) >= s) return rtf.format(Math.round(diff / s), u);
    return rtf.format(0, "minute");
  };
  const daysUntil = (s) => { const d = parseDay(s); if (!d) return null; const now = new Date(); now.setHours(0, 0, 0, 0); return Math.round((d - now) / 864e5); };

  const icon = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const I = {
    home: icon('<path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>'),
    inbox: icon('<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>'),
    tag: icon('<path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1.5"/>'),
    gear: icon('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'),
    ext: icon('<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/>'),
    out: icon('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>'),
    plus: icon('<path d="M12 5v14M5 12h14"/>'),
    phone: icon('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>'),
    chat: icon('<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>'),
    x: icon('<path d="M18 6 6 18M6 6l12 12"/>'),
    download: icon('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>'),
    image: icon('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>'),
    mega: icon('<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>'),
  };

  const state = { orders: [], products: [], settings: {}, filter: "all", q: "", line: "all", seen: null };

  // ---------- toast ----------
  let toastTimer;
  function toast(msg, kind = "") {
    toastEl.textContent = msg;
    toastEl.className = `toast show ${kind}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toastEl.className = "toast"), kind === "new" ? 5200 : 2600);
  }
  function chime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [660, 880].forEach((f, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = f; o.type = "sine";
        g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
        g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + i * 0.18 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.35);
        o.connect(g).connect(ctx.destination);
        o.start(ctx.currentTime + i * 0.18); o.stop(ctx.currentTime + i * 0.18 + 0.4);
      });
    } catch (e) {}
  }

  const langToggle = () => `<div class="lang-mini" role="group" aria-label="Language">
      <button type="button" data-action="lang" data-lang="en" aria-pressed="${lang === "en"}">EN</button>
      <button type="button" data-action="lang" data-lang="am" aria-pressed="${lang === "am"}">አማ</button></div>`;

  // ---------- sign-in ----------
  function renderLogin(msg = "", ok = false) {
    document.documentElement.lang = lang;
    document.title = t("appName");
    const panel = S.isLive
      ? `<form class="login-form" id="login-form" novalidate>
          <label class="field"><span>${t("email")}</span><input id="lf-email" type="email" autocomplete="username" required></label>
          <label class="field"><span>${t("password")}</span><input id="lf-pass" type="password" autocomplete="current-password" required></label>
          <button class="btn red" type="submit">${t("signIn")}</button>
          <small style="color:var(--ink-soft)">${t("forgotHint")}</small>
          <p class="form-msg ${ok ? "ok" : ""}" role="status">${esc(msg)}</p>
        </form>`
      : `<div class="demo-card">
          <h2>${t("demoTitle")}</h2>
          <p>${t("demoText")}</p>
          <button class="btn red" type="button" data-action="demo">${t("openDemo")}</button>
          <p><small>${t("demoSetup")}</small></p>
        </div>`;
    root.innerHTML = `<div class="login">
      <div class="login-art"><div><h2>${t("artTitle")}</h2><p>${t("artText")}</p></div></div>
      <div class="login-panel">
        <div class="brand"><img src="../images/logo.jpg" alt=""><div><b>Mayza Design</b><small>${t("admin")}</small></div></div>
        ${langToggle()}
        <h1>${t("signInTitle")}</h1>
        ${panel}
      </div></div>`;
    const form = document.getElementById("login-form");
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = form.querySelector("button[type=submit]");
        const m = form.querySelector(".form-msg");
        btn.disabled = true; btn.textContent = t("signingIn"); m.textContent = ""; m.className = "form-msg";
        try {
          await S.signIn(form.elements[0].value.trim(), form.elements[1].value);
          await enter();
        } catch (err) {
          m.textContent = err.message;
          btn.disabled = false; btn.textContent = t("signIn");
        }
      });
    }
  }

  // ---------- data ----------
  async function loadAll() {
    const [orders, products, settings] = await Promise.all([S.listOrders(), S.listProducts({ all: true }), S.getSettings()]);
    state.orders = orders; state.products = products; state.settings = settings;
    if (!state.seen) state.seen = new Set(orders.map((o) => o.id));
  }
  async function refreshOrders() {
    try {
      const orders = await S.listOrders();
      const fresh = orders.filter((o) => !state.seen.has(o.id));
      state.orders = orders;
      fresh.forEach((o) => state.seen.add(o.id));
      const incoming = fresh.filter((o) => o.status === "new");
      if (incoming.length) { toast(t("newOrderToast", { name: incoming[0].name }), "new"); chime(); }
      if (!drawerWrap.hidden) return; // don't redraw under an open form
      render();
    } catch (e) {}
  }

  async function enter() {
    root.innerHTML = `<div class="boot"><img src="../images/logo.jpg" alt="" width="56" height="56"></div>`;
    try {
      await loadAll();
    } catch (err) {
      if (err.status === 401) { renderLogin(err.message); return; }
      root.innerHTML = `<div class="empty" style="min-height:100vh;align-content:center"><p>${esc(t("loadFail", { msg: err.message }))}</p><button class="btn" data-action="retry">${t("retry")}</button></div>`;
      return;
    }
    if (!location.hash) location.hash = "dashboard";
    render();
    S.onOrdersChange(refreshOrders);
  }

  // ---------- shell ----------
  const routes = ["dashboard", "orders", "products", "settings"];
  const routeIcon = { dashboard: I.home, orders: I.inbox, products: I.tag, settings: I.gear };
  const current = () => { const r = location.hash.replace("#", "").split("/")[0]; return routes.includes(r) ? r : "dashboard"; };
  const newCount = () => state.orders.filter((o) => o.status === "new").length;

  function shell(title, eyebrow, actions, body) {
    const r = current();
    const n = newCount();
    const navLinks = (cls) => routes.map((x) => `<a href="#${x}" class="${cls}" ${x === r ? 'aria-current="page"' : ""}>${routeIcon[x]}<span>${t(x)}</span>${x === "orders" && n ? `<b class="badge">${n}</b>` : ""}</a>`).join("");
    document.documentElement.lang = lang;
    document.title = (n ? `(${n}) ` : "") + t("appName");
    return `<div class="shell">
      <aside class="side">
        <a class="brand" href="#dashboard"><img src="../images/logo.jpg" alt=""><span><b>Mayza Design</b><small>${t("admin")}</small></span></a>
        <nav class="nav" aria-label="Admin">${navLinks("")}</nav>
        <div class="side-foot">
          ${langToggle()}
          <a href="../index.html" target="_blank" rel="noopener">${I.ext}<span>${t("viewSite")}</span></a>
          <button class="plain" type="button" data-action="signout">${I.out}<span>${t("signOut")}</span></button>
        </div>
      </aside>
      <div class="main">
        <div class="mobile-head"><img src="../images/logo.jpg" alt=""><b>Mayza Design</b>${langToggle()}
          <a class="icon-btn" href="../index.html" target="_blank" rel="noopener" aria-label="${t("viewSite")}">${I.ext}</a>
          <button class="icon-btn" type="button" data-action="signout" aria-label="${t("signOut")}">${I.out}</button></div>
        ${S.isLive ? "" : `<div class="demo-bar">${t("demoBanner")}</div>`}
        <header class="top"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1></div><div class="top-actions">${actions}</div></header>
        <div class="view">${body}</div>
      </div>
      <nav class="tabbar" aria-label="Admin">${navLinks("")}</nav>
    </div>`;
  }

  function render() {
    const r = current();
    const views = { dashboard: viewDashboard, orders: viewOrders, products: viewProducts, settings: viewSettings };
    root.innerHTML = views[r]();
    if (r === "orders") drawOrderList();
    if (r === "settings") bindSettings();
    const deep = location.hash.split("/")[1];
    if (r === "orders" && deep) { const o = state.orders.find((x) => x.id === deep); if (o) openOrder(o); }
  }

  // ---------- shared bits ----------
  const pill = (s) => `<span class="pill ${s}">${t(s)}</span>`;
  function dueBadge(o) {
    if (!o.needed_by) return `<span class="due">${t("noDate")}</span>`;
    const d = daysUntil(o.needed_by);
    if (!OPEN.includes(o.status)) return `<span class="due">${fmtDay(o.needed_by)}</span>`;
    if (d < 0) return `<span class="due late">${t("overdue", { n: -d })}</span>`;
    if (d === 0) return `<span class="due late">${t("dueToday")}</span>`;
    if (d <= 7) return `<span class="due soon">${t("dueIn", { n: d })}</span>`;
    return `<span class="due">${fmtDay(o.needed_by)}</span>`;
  }
  const garmentText = (o) => [o.product_name, o.garment ? t("g_" + o.garment) : "", o.who ? t("w_" + o.who) : ""].filter(Boolean);
  function orderRow(o) {
    const g = garmentText(o);
    return `<button class="row" type="button" data-action="open-order" data-id="${esc(o.id)}">
      <span class="who"><b>${esc(o.name)}</b><small>${esc(o.phone)} · ${esc(o.ref || "")}</small></span>
      <span class="what"><span>${esc(g[0] || "—")}</span><small>${esc(g.slice(1).join(" · ") || ago(o.created_at))}</small></span>
      <span class="due-cell">${dueBadge(o)}</span>
      <span class="status-cell">${pill(o.status)}</span>
      <span class="amt">${o.price != null ? money(o.price) : `<small>${t("priceTbd")}</small>`}</span>
    </button>`;
  }
  const emptyBox = (text) => `<div class="empty">${I.inbox}<p>${text}</p></div>`;

  // ---------- overview ----------
  function viewDashboard() {
    const o = state.orders;
    const count = (list) => o.filter((x) => list.includes(x.status)).length;
    const open = o.filter((x) => OPEN.includes(x.status));
    const value = open.reduce((s, x) => s + (Number(x.price) || 0), 0);
    const deposits = open.reduce((s, x) => s + (Number(x.deposit) || 0), 0);
    const attention = open
      .filter((x) => x.status === "new" || (x.needed_by && daysUntil(x.needed_by) <= 3))
      .sort((a, b) => (a.status === "new" ? -1 : 0) - (b.status === "new" ? -1 : 0) || String(a.needed_by || "9").localeCompare(String(b.needed_by || "9")))
      .slice(0, 6);
    const stat = (n, label, tone, filter) => `<button class="card stat" type="button" data-action="go-orders" data-filter="${filter}" style="--tone:${tone}"><strong>${n}</strong><span>${label}</span></button>`;
    const todayStr = new Date().toLocaleDateString(locale(), { weekday: "long", day: "numeric", month: "long" });
    const body = `
      <div class="stats">
        ${stat(count(["new"]), t("statNew"), "var(--red)", "new")}
        ${stat(count(["confirmed", "in_progress"]), t("statWork"), "var(--amber)", "in_progress")}
        ${stat(count(["ready"]), t("statReady"), "var(--green)", "ready")}
        <a class="card stat" href="#products" style="--tone:var(--ink);text-decoration:none"><strong>${state.products.filter((p) => p.visible).length}</strong><span>${t("statLive")}</span></a>
      </div>
      <div class="card money">
        <div><span>${t("valueActive")}</span><strong>${money(value)}</strong></div>
        <div><span>${t("deposits")}</span><strong>${money(deposits)}</strong></div>
        <div class="gold"><span>${t("toCollect")}</span><strong>${money(Math.max(value - deposits, 0))}</strong></div>
      </div>
      <div class="two-col">
        <div style="display:grid;gap:18px">
          <section class="card"><div class="card-head"><h2>${t("attention")}</h2></div>
            <div class="rows">${attention.length ? attention.map(orderRow).join("") : emptyBox(t("attentionEmpty"))}</div></section>
          <section class="card"><div class="card-head"><h2>${t("recent")}</h2><a class="btn ghost small" href="#orders">${t("seeAll")}</a></div>
            <div class="rows compact">${o.length ? o.slice(0, 5).map(orderRow).join("") : emptyBox(t("noOrders"))}</div></section>
        </div>
        <section class="card"><div class="card-head"><h2>${t("quick")}</h2></div><div class="card-body quick-actions">
          <button type="button" data-action="new-order"><span class="qi">${I.plus}</span><span>${t("addOrder")}<br><small style="font-weight:500;color:var(--ink-soft)">${t("addOrderHint")}</small></span></button>
          <button type="button" data-action="new-product"><span class="qi" style="background:var(--red)">${I.image}</span><span>${t("addProduct")}<br><small style="font-weight:500;color:var(--ink-soft)">${t("addProductHint")}</small></span></button>
          <button type="button" data-action="go-announce"><span class="qi" style="background:var(--gold);color:var(--ink)">${I.mega}</span><span>${t("editAnnounce")}<br><small style="font-weight:500;color:var(--ink-soft)">${t("editAnnounceHint")}</small></span></button>
        </div></section>
      </div>`;
    return shell(t("hello"), esc(t("today", { date: todayStr })), `<button class="btn red" type="button" data-action="new-order">${I.plus}${t("addOrder")}</button>`, body);
  }

  // ---------- orders ----------
  function viewOrders() {
    const counts = Object.fromEntries(STATUSES.map((s) => [s, state.orders.filter((o) => o.status === s).length]));
    const chip = (key, label, n) => `<button class="chip" type="button" data-action="filter" data-filter="${key}" aria-pressed="${state.filter === key}">${label} <b>${n}</b></button>`;
    const body = `<section class="card">
      <div class="toolbar">
        <div class="chips">${chip("all", t("all"), state.orders.length)}${STATUSES.map((s) => chip(s, t(s), counts[s])).join("")}</div>
        <input class="search" id="order-search" type="search" placeholder="${t("search")}" value="${esc(state.q)}" aria-label="${t("search")}">
      </div>
      <div class="rows" id="order-list"></div>
    </section>`;
    const actions = `<button class="btn ghost" type="button" data-action="export">${I.download}${t("exportCsv")}</button>
      <button class="btn red" type="button" data-action="new-order">${I.plus}${t("addOrder")}</button>`;
    return shell(t("orders"), t("ordersCount", { n: state.orders.length }), actions, body);
  }
  function filteredOrders() {
    const q = state.q.trim().toLowerCase();
    return state.orders.filter((o) => (state.filter === "all" || o.status === state.filter) &&
      (!q || [o.name, o.phone, o.ref, o.product_name, o.notes].some((v) => String(v || "").toLowerCase().includes(q))));
  }
  function drawOrderList() {
    const el = document.getElementById("order-list");
    if (!el) return;
    const list = filteredOrders();
    el.innerHTML = list.length ? list.map(orderRow).join("") : emptyBox(state.orders.length ? t("noMatch") : t("noOrders"));
    const s = document.getElementById("order-search");
    s.oninput = () => { state.q = s.value; drawOrderList(); };
  }

  function exportCsv() {
    const cols = ["ref", "created_at", "name", "phone", "status", "garment", "who", "product_name", "needed_by", "chest", "waist", "hip", "height", "price", "deposit", "source", "notes", "admin_notes"];
    const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = filteredOrders().map((o) => cols.map((c) => cell(["chest", "waist", "hip", "height"].includes(c) ? (o.measurements || {})[c] : o[c])).join(","));
    const csv = "﻿" + [cols.join(","), ...rows].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `${t("csvName")}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  // ---------- drawer ----------
  let lastFocus = null;
  function openDrawer(html) {
    lastFocus = document.activeElement;
    drawer.innerHTML = html;
    drawerWrap.hidden = false;
    document.body.style.overflow = "hidden";
    setTimeout(() => { const f = drawer.querySelector("input, select, textarea, button"); if (f) f.focus({ preventScroll: true }); }, 60);
  }
  function closeDrawer() {
    drawerWrap.hidden = true;
    drawer.innerHTML = "";
    document.body.style.overflow = "";
    if (location.hash.includes("/")) history.replaceState(null, "", "#" + current());
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  const opts = (list, val, label, blank) => (blank ? `<option value="">${t("choose")}</option>` : "") + list.map((v) => `<option value="${esc(v)}" ${v === val ? "selected" : ""}>${esc(label(v))}</option>`).join("");
  const val = (id) => { const el = drawer.querySelector("#" + id); return el ? el.value.trim() : ""; };

  function openOrder(o) {
    const isNew = !o;
    o = o || { status: "confirmed", source: "phone", measurements: {} };
    const m = o.measurements || {};
    const prod = state.products.find((p) => p.id === o.product_id);
    const intl = S.intlPhone(o.phone);
    const wa = `https://wa.me/${intl}?text=${encodeURIComponent(t("waGreeting", { name: (o.name || "").split(" ")[0], ref: o.ref || "" }))}`;
    if (!isNew && o.id) history.replaceState(null, "", `#orders/${o.id}`);
    openDrawer(`
      <div class="drawer-head"><div>
        <p class="eyebrow">${isNew ? t("newOrder") : `${t("order")} ${esc(o.ref || "")}`}</p>
        <h2 id="drawer-title">${isNew ? t("addOrder") : esc(o.name)}</h2>
        ${isNew ? "" : `<small>${t("placed", { when: ago(o.created_at) })} · ${srcLabel(o.source)}</small>`}
      </div><button class="icon-btn" type="button" data-action="close-drawer" aria-label="${t("close")}">${I.x}</button></div>
      <form class="drawer-body" id="order-form" novalidate>
        ${isNew ? "" : `<div class="contact-row">
          <a class="btn green small" href="tel:+${intl}">${I.phone}${t("call")}</a>
          <a class="btn small" href="${wa}" target="_blank" rel="noopener" style="background:#25D366;border-color:#25D366;color:#fff">${I.chat}${t("whatsapp")}</a></div>`}
        <div class="section-box"><h3>${t("status")}</h3>
          <div class="status-picker">${STATUSES.map((s) => `<label><input type="radio" name="status" value="${s}" ${o.status === s ? "checked" : ""}>${pill(s)}</label>`).join("")}</div>
        </div>
        <div class="section-box"><h3>${t("customer")}</h3>
          <div class="grid-2">
            <label class="field"><span>${t("name")}</span><input id="of-name" value="${esc(o.name)}" autocomplete="off"></label>
            <label class="field"><span>${t("phone")}</span><input id="of-phone" type="tel" value="${esc(o.phone)}" autocomplete="off"></label>
          </div>
          <label class="field"><span>${t("source")}</span><select id="of-source">${opts(SOURCES, o.source, srcLabel)}</select></label>
        </div>
        <div class="section-box"><h3>${t("order")}</h3>
          ${prod ? `<div class="piece"><img src="${esc(imgUrl(prod.image_url))}" alt=""><b>${esc(lang === "am" && prod.name_am ? prod.name_am : prod.name_en)}</b></div>` : ""}
          <label class="field"><span>${t("product")}</span><select id="of-product"><option value="">${t("none")}</option>${state.products.map((p) => `<option value="${esc(p.id)}" ${p.id === o.product_id ? "selected" : ""}>${esc(lang === "am" && p.name_am ? p.name_am : p.name_en)}</option>`).join("")}</select></label>
          <div class="grid-2">
            <label class="field"><span>${t("garment")}</span><select id="of-garment">${opts(GARMENTS, o.garment, (g) => t("g_" + g), true)}</select></label>
            <label class="field"><span>${t("who")}</span><select id="of-who">${opts(WHOS, o.who, (w) => t("w_" + w), true)}</select></label>
          </div>
          <label class="field"><span>${t("neededBy")}</span><input id="of-date" type="date" value="${esc((o.needed_by || "").slice(0, 10))}"></label>
          <div class="field"><span class="label">${t("measurements")}</span><div class="grid-4">
            ${["chest", "waist", "hip", "height"].map((k) => `<input id="of-${k}" inputmode="decimal" placeholder="${t(k)}" aria-label="${t(k)}" value="${esc(m[k])}">`).join("")}
          </div></div>
          <label class="field"><span>${t("custNotes")}</span><textarea id="of-notes">${esc(o.notes)}</textarea></label>
        </div>
        <div class="section-box"><h3>${t("work")}</h3>
          <div class="grid-2">
            <label class="field"><span>${t("price")}</span><input id="of-price" inputmode="numeric" value="${o.price ?? ""}"></label>
            <label class="field"><span>${t("deposit")}</span><input id="of-deposit" inputmode="numeric" value="${o.deposit ?? ""}"></label>
          </div>
          <div class="balance" id="of-balance"></div>
          <label class="field"><span>${t("adminNotes")}</span><textarea id="of-admin">${esc(o.admin_notes)}</textarea><small>${t("adminNotesHint")}</small></label>
        </div>
        <p class="form-msg" id="of-msg" role="status"></p>
      </form>
      <div class="drawer-foot">
        ${isNew ? "" : `<button class="btn danger small" type="button" data-action="delete-order" data-id="${esc(o.id)}">${t("delete")}</button>`}
        <span class="spacer"></span>
        <button class="btn ghost" type="button" data-action="close-drawer">${t("cancel")}</button>
        <button class="btn red" type="button" data-action="save-order" data-id="${esc(o.id || "")}">${t("save")}</button>
      </div>`);
    const bal = () => {
      const p = Number(val("of-price")) || 0, d = Number(val("of-deposit")) || 0, el = drawer.querySelector("#of-balance");
      if (!val("of-price")) { el.hidden = true; return; }
      el.hidden = false;
      el.className = "balance" + (p - d <= 0 ? " paid" : "");
      el.innerHTML = p - d <= 0 ? `<span>${t("paidFull")}</span><span>${money(p)}</span>` : `<span>${t("balance")}</span><span>${money(p - d)}</span>`;
    };
    drawer.querySelector("#of-price").addEventListener("input", bal);
    drawer.querySelector("#of-deposit").addEventListener("input", bal);
    drawer.querySelector("#of-product").addEventListener("change", (e) => {
      const p = state.products.find((x) => x.id === e.target.value);
      const g = drawer.querySelector("#of-garment");
      if (p && !g.value) g.value = p.line === "streetwear" ? "street" : p.line === "children" ? "cultural" : p.line;
    });
    bal();
  }

  async function saveOrder(id, btn) {
    const msg = drawer.querySelector("#of-msg");
    if (!val("of-name") || !val("of-phone")) { msg.textContent = t("needNamePhone"); return; }
    const pid = val("of-product");
    const prod = state.products.find((p) => p.id === pid);
    const existing = state.orders.find((o) => o.id === id) || {};
    const row = {
      ...(id ? { id } : {}),
      name: val("of-name"), phone: val("of-phone"), source: val("of-source"),
      status: (drawer.querySelector("input[name=status]:checked") || {}).value || "new",
      product_id: pid || null, product_name: prod ? prod.name_en : existing.product_name || null, // keeps the piece name if the product was later deleted
      garment: val("of-garment") || null, who: val("of-who") || null, needed_by: val("of-date") || null,
      measurements: Object.fromEntries(["chest", "waist", "hip", "height"].map((k) => [k, val("of-" + k)]).filter(([, v]) => v)),
      notes: val("of-notes") || null, price: val("of-price"), deposit: val("of-deposit"), admin_notes: val("of-admin") || null,
    };
    btn.disabled = true; btn.textContent = t("saving");
    try {
      await S.saveOrder(row);
      state.orders = await S.listOrders();
      state.orders.forEach((o) => state.seen.add(o.id));
      closeDrawer(); render(); toast(t("saved"));
    } catch (err) {
      msg.textContent = err.message; btn.disabled = false; btn.textContent = t("save");
    }
  }

  // two-step delete: first tap arms the button, second tap deletes
  function armDelete(btn, run) {
    if (!btn.classList.contains("armed")) {
      btn.classList.add("armed");
      btn.textContent = t("yesDelete");
      setTimeout(() => { if (btn.isConnected) { btn.classList.remove("armed"); btn.textContent = t("delete"); } }, 4000);
      return;
    }
    btn.disabled = true;
    run().catch((err) => { toast(err.message); btn.disabled = false; });
  }

  // ---------- products ----------
  function viewProducts() {
    const list = state.products.filter((p) => state.line === "all" || p.line === state.line);
    const chip = (key, label, n) => `<button class="chip" type="button" data-action="line" data-line="${key}" aria-pressed="${state.line === key}">${label} <b>${n}</b></button>`;
    const cards = list.map((p) => `<article class="card product ${p.visible ? "" : "is-hidden"}">
        <button class="ph" type="button" data-action="edit-product" data-id="${esc(p.id)}" aria-label="${t("edit")}: ${esc(p.name_en)}" style="border:0;padding:0;cursor:pointer">
          ${p.image_url ? `<img src="${esc(imgUrl(p.image_url))}" alt="" loading="lazy">` : ""}
          <span class="tags">${p.featured ? `<span class="tag gold">${t("featured")}</span>` : ""}${p.visible ? "" : `<span class="tag off">${t("hidden")}</span>`}</span>
        </button>
        <div class="meta">
          <b>${esc(lang === "am" && p.name_am ? p.name_am : p.name_en)}</b>
          <small>${t("l_" + p.line)}</small>
          ${p.price != null ? `<span class="price">${money(p.price)}</span>` : `<span class="price muted">${t("priceRequest")}</span>`}
          <div class="foot">
            <label><span class="switch"><input type="checkbox" data-action="toggle-visible" data-id="${esc(p.id)}" ${p.visible ? "checked" : ""} aria-label="${t("visible")}"><span></span></span>${p.visible ? t("onSite") : t("hidden")}</label>
            <button class="btn ghost small" type="button" data-action="edit-product" data-id="${esc(p.id)}">${t("edit")}</button>
          </div>
        </div></article>`).join("");
    const body = `<div class="toolbar card" style="margin-bottom:16px;border:0">
        <div class="chips">${chip("all", t("all"), state.products.length)}${LINES.map((l) => chip(l, t("l_" + l), state.products.filter((p) => p.line === l).length)).join("")}</div>
      </div>
      <p style="color:var(--ink-soft);margin:0 0 14px">${t("productsIntro")}</p>
      ${list.length ? `<div class="products">${cards}</div>` : `<div class="card">${emptyBox(t("noProducts"))}</div>`}`;
    return shell(t("products"), `${state.products.filter((p) => p.visible).length} ${t("onSite").toLowerCase()}`, `<button class="btn red" type="button" data-action="new-product">${I.plus}${t("addProduct")}</button>`, body);
  }

  let pendingImage = null;
  function openProduct(p) {
    const isNew = !p;
    p = p || { line: state.line !== "all" ? state.line : "cultural", visible: true, featured: false, sort: (state.products.reduce((m, x) => Math.max(m, x.sort || 0), 0) + 1) };
    pendingImage = p.image_url || null;
    openDrawer(`
      <div class="drawer-head"><div><p class="eyebrow">${t("products")}</p><h2 id="drawer-title">${isNew ? t("newProduct") : t("editProduct")}</h2></div>
        <button class="icon-btn" type="button" data-action="close-drawer" aria-label="${t("close")}">${I.x}</button></div>
      <form class="drawer-body" id="product-form" novalidate>
        <div class="section-box"><h3>${t("photo")}</h3>
          <label class="photo-drop ${pendingImage ? "has" : ""}" id="pf-drop" style="${pendingImage ? `background-image:url('${esc(imgUrl(pendingImage))}')` : ""}">
            <input id="pf-file" type="file" accept="image/*">
            <span>${pendingImage ? t("changePhoto") : `${I.image}${t("choosePhoto")}`}</span>
          </label>
          <small style="color:var(--ink-soft)">${t("photoHint")}</small>
        </div>
        <div class="section-box">
          <div class="grid-2">
            <label class="field"><span>${t("nameEn")}</span><input id="pf-name-en" value="${esc(p.name_en)}"></label>
            <label class="field"><span>${t("nameAm")}</span><input id="pf-name-am" value="${esc(p.name_am)}"></label>
          </div>
          <div class="grid-2">
            <label class="field"><span>${t("line")}</span><select id="pf-line">${opts(LINES, p.line, (l) => t("l_" + l))}</select></label>
            <label class="field"><span>${t("priceOpt")}</span><input id="pf-price" inputmode="numeric" value="${p.price ?? ""}"><small>${t("priceOptHint")}</small></label>
          </div>
          <label class="field"><span>${t("descEn")}</span><textarea id="pf-desc-en">${esc(p.description_en)}</textarea></label>
          <label class="field"><span>${t("descAm")}</span><textarea id="pf-desc-am">${esc(p.description_am)}</textarea></label>
        </div>
        <div class="section-box">
          <label class="check"><input id="pf-visible" type="checkbox" ${p.visible ? "checked" : ""}><span>${t("visible")}</span></label>
          <label class="check"><input id="pf-featured" type="checkbox" ${p.featured ? "checked" : ""}><span>${t("featuredLabel")}<small>${t("featuredHint")}</small></span></label>
          <label class="field" style="max-width:160px"><span>${t("position")}</span><input id="pf-sort" inputmode="numeric" value="${p.sort ?? 0}"><small>${t("positionHint")}</small></label>
        </div>
        <p class="form-msg" id="pf-msg" role="status"></p>
      </form>
      <div class="drawer-foot">
        ${isNew ? "" : `<button class="btn danger small" type="button" data-action="delete-product" data-id="${esc(p.id)}">${t("delete")}</button>`}
        <span class="spacer"></span>
        <button class="btn ghost" type="button" data-action="close-drawer">${t("cancel")}</button>
        <button class="btn red" type="button" data-action="save-product" data-id="${esc(p.id || "")}">${t("save")}</button>
      </div>`);

    const drop = drawer.querySelector("#pf-drop");
    const input = drawer.querySelector("#pf-file");
    const msg = drawer.querySelector("#pf-msg");
    const take = async (file) => {
      if (!file) return;
      msg.className = "form-msg ok"; msg.textContent = t("uploading");
      drawer.querySelector('[data-action="save-product"]').disabled = true;
      try {
        pendingImage = await S.uploadImage(file);
        drop.classList.add("has");
        drop.style.backgroundImage = `url('${imgUrl(pendingImage)}')`;
        drop.querySelector("span").textContent = t("changePhoto");
        msg.textContent = "";
      } catch (err) {
        msg.className = "form-msg"; msg.textContent = err.message;
      } finally {
        drawer.querySelector('[data-action="save-product"]').disabled = false;
      }
    };
    input.addEventListener("change", () => take(input.files[0]));
    ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("drag"); }));
    ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("drag"); }));
    drop.addEventListener("drop", (e) => take(e.dataTransfer.files[0]));
  }

  async function saveProduct(id, btn) {
    const msg = drawer.querySelector("#pf-msg");
    msg.className = "form-msg";
    if (!val("pf-name-en")) { msg.textContent = t("needProductName"); return; }
    if (!pendingImage) { msg.textContent = t("needPhoto"); return; }
    const row = {
      ...(id ? { id } : {}),
      name_en: val("pf-name-en"), name_am: val("pf-name-am") || null,
      description_en: val("pf-desc-en") || null, description_am: val("pf-desc-am") || null,
      line: val("pf-line"), price: val("pf-price"), image_url: pendingImage,
      visible: drawer.querySelector("#pf-visible").checked, featured: drawer.querySelector("#pf-featured").checked,
      sort: val("pf-sort"),
    };
    btn.disabled = true; btn.textContent = t("saving");
    try {
      await S.saveProduct(row);
      state.products = await S.listProducts({ all: true });
      closeDrawer(); render(); toast(t("saved"));
    } catch (err) {
      msg.textContent = err.message; btn.disabled = false; btn.textContent = t("save");
    }
  }

  // ---------- settings ----------
  function viewSettings() {
    const s = state.settings;
    const f = (key, label, type = "text", hint = "") => `<label class="field"><span>${label}</span><input id="sf-${key}" type="${type}" value="${esc(s[key])}">${hint ? `<small>${hint}</small>` : ""}</label>`;
    const body = `<form class="settings" id="settings-form" novalidate>
      <section class="card" id="announce"><div class="card-head"><h2>${t("announce")}</h2></div><div class="card-body">
        <p class="hint">${t("announceHint")}</p>
        <label class="check"><input id="sf-announce_on" type="checkbox" ${s.announce_on ? "checked" : ""}><span>${t("announceOn")}</span></label>
        <div class="grid-2">${f("announce_en", t("announceEn"))}${f("announce_am", t("announceAm"))}</div>
        <div><span class="label">${t("preview")}</span><div class="announce-preview" id="announce-preview"></div></div>
      </div></section>
      <section class="card"><div class="card-head"><h2>${t("contact")}</h2></div><div class="card-body">
        <p class="hint">${t("contactHint")}</p>
        <div class="grid-2">${f("phone", t("phoneMain"), "tel")}${f("phone2", t("phone2"), "tel")}</div>
        <div class="grid-2">${f("whatsapp", t("whatsappNum"), "tel")}${f("telegram", t("telegramVal"))}</div>
      </div></section>
      <section class="card"><div class="card-head"><h2>${t("location")}</h2></div><div class="card-body">
        <div class="grid-2">${f("address_en", t("addressEn"))}${f("address_am", t("addressAm"))}</div>
        <div class="grid-2">${f("hours_en", t("hoursEn"))}${f("hours_am", t("hoursAm"))}</div>
      </div></section>
      <section class="card"><div class="card-head"><h2>${t("socialLinks")}</h2></div><div class="card-body">
        ${f("facebook", "Facebook", "url")}${f("tiktok", "TikTok", "url")}${f("instagram", "Instagram", "url")}
      </div></section>
      <section class="card"><div class="card-head"><h2>${t("stats")}</h2></div><div class="card-body">
        <p class="hint">${t("statsHint")}</p>
        <div class="grid-2">${f("stat_facebook", t("statFb"))}${f("stat_tiktok", t("statTt"))}</div>
        <div class="grid-2">${f("stat_likes", t("statLikes"))}</div>
      </div></section>
      ${S.isLive ? `<section class="card"><div class="card-head"><h2>${t("account")}</h2></div><div class="card-body">
        <div class="grid-2"><label class="field"><span>${t("currentPassword")}</span><input id="pw-current" type="password" autocomplete="current-password"></label>
          <label class="field"><span>${t("newPassword")}</span><input id="pw-new" type="password" autocomplete="new-password"><small>${t("pwShort")}</small></label></div>
        <div><button class="btn ghost" type="button" data-action="change-password">${t("changePassword")}</button></div>
      </div></section>` : `<section class="card"><div class="card-head"><h2>${t("demoData")}</h2></div><div class="card-body">
        <p class="hint">${t("resetDemoHint")}</p><div><button class="btn ghost" type="button" data-action="reset-demo">${t("resetDemo")}</button></div>
      </div></section>`}
      <div class="save-bar"><button class="btn red" type="submit">${t("saveSettings")}</button></div>
    </form>`;
    return shell(t("settings"), t("viewSite"), "", body);
  }
  function bindSettings() {
    const form = document.getElementById("settings-form");
    const prev = document.getElementById("announce-preview");
    const draw = () => {
      const txt = (lang === "am" ? form.querySelector("#sf-announce_am").value : "") || form.querySelector("#sf-announce_en").value;
      prev.innerHTML = txt ? `<b>✦</b> ${esc(txt)}` : "—";
      prev.style.opacity = form.querySelector("#sf-announce_on").checked ? 1 : 0.45;
    };
    form.addEventListener("input", draw);
    draw();
    if (location.hash.includes("announce")) setTimeout(() => document.getElementById("announce").scrollIntoView({ behavior: "smooth" }), 50);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = form.querySelector("button[type=submit]");
      const next = { ...state.settings };
      Object.keys(S.DEFAULT_SETTINGS).forEach((k) => {
        const el = form.querySelector("#sf-" + k);
        if (!el) return;
        next[k] = el.type === "checkbox" ? el.checked : el.value.trim();
      });
      btn.disabled = true; btn.textContent = t("saving");
      try {
        await S.saveSettings(next);
        state.settings = next;
        toast(t("settingsSaved"));
      } catch (err) { toast(err.message); }
      btn.disabled = false; btn.textContent = t("saveSettings");
    });
  }

  // ---------- one click handler for the whole app ----------
  document.addEventListener("click", async (e) => {
    const el = e.target.closest("[data-action]");
    if (!el) return;
    const a = el.dataset.action;
    const id = el.dataset.id;
    if (a === "toggle-visible") return; // handled on change
    if (["lang", "demo", "signout", "retry", "go-orders", "filter", "line", "new-order", "open-order", "close-drawer", "save-order", "delete-order", "export", "new-product", "edit-product", "save-product", "delete-product", "go-announce", "reset-demo", "change-password"].includes(a)) e.preventDefault();
    switch (a) {
      case "lang":
        lang = el.dataset.lang;
        try { localStorage.setItem("mayza-admin-lang", lang); } catch (err) {}
        if (!root.querySelector(".shell")) renderLogin(); else { render(); }
        break;
      case "demo": await S.startDemo(); await enter(); break;
      case "signout": await S.signOut(); location.hash = ""; renderLogin(); break;
      case "retry": enter(); break;
      case "go-orders": state.filter = el.dataset.filter; location.hash = "orders"; break;
      case "filter": state.filter = el.dataset.filter; root.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", c === el)); drawOrderList(); break;
      case "line": state.line = el.dataset.line; render(); break;
      case "new-order": openOrder(null); break;
      case "open-order": openOrder(state.orders.find((o) => o.id === id)); break;
      case "close-drawer": closeDrawer(); break;
      case "save-order": saveOrder(id, el); break;
      case "delete-order":
        armDelete(el, async () => { await S.deleteOrder(id); state.orders = state.orders.filter((o) => o.id !== id); closeDrawer(); render(); toast(t("deleted")); });
        break;
      case "export": exportCsv(); break;
      case "new-product": if (current() !== "products") location.hash = "products"; setTimeout(() => openProduct(null), 30); break;
      case "edit-product": openProduct(state.products.find((p) => p.id === id)); break;
      case "save-product": saveProduct(id, el); break;
      case "delete-product":
        armDelete(el, async () => { await S.deleteProduct(id); state.products = state.products.filter((p) => p.id !== id); closeDrawer(); render(); toast(t("deleted")); });
        break;
      case "go-announce": location.hash = "settings/announce"; break;
      case "reset-demo": S.resetDemo(); state.seen = null; await loadAll(); render(); toast(t("demoReset")); break;
      case "change-password": {
        const v = document.getElementById("pw-new").value;
        if (v.length < 8) { toast(t("pwShort")); return; }
        const cur = document.getElementById("pw-current").value;
        try { await S.changePassword(cur, v); document.getElementById("pw-new").value = ""; document.getElementById("pw-current").value = ""; toast(t("pwChanged")); } catch (err) { toast(err.message); }
        break;
      }
    }
  });

  document.addEventListener("change", async (e) => {
    const el = e.target.closest('[data-action="toggle-visible"]');
    if (!el) return;
    const p = state.products.find((x) => x.id === el.dataset.id);
    if (!p) return;
    try {
      await S.saveProduct({ ...p, visible: el.checked });
      p.visible = el.checked;
      render();
      toast(t("saved"));
    } catch (err) { el.checked = !el.checked; toast(err.message); }
  });

  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !drawerWrap.hidden) closeDrawer(); });
  addEventListener("hashchange", () => { if (root.querySelector(".shell")) { if (!drawerWrap.hidden && !location.hash.includes("/")) closeDrawer(); render(); } });

  // ---------- start ----------
  (async () => {
    try {
      await S.ready();
      const session = await S.session();
      if (session) await enter(); else renderLogin();
    } catch (err) {
      renderLogin(err.message);
    }
  })();
})();

/**
 * ============================================================
 * FOOD WASTE MANAGEMENT SYSTEM — DATABASE LAYER
 * SRM Hostel | Version 2.1
 * localStorage-backed database with student registration support
 *
 * SCHEMA:
 *  fwms_students       → Array<{regNo, name, class, branch, room, password}>
 *  fwms_staff          → Array<{username, password, name, role}>
 *  fwms_currentUser    → {regNo, name, class, branch, type:'student', ...}
 *  fwms_currentStaff   → {username, name, type:'staff', ...}
 *  fwms_subs_{date}    → Object keyed by regNo → SubmissionRecord
 *  fwms_menu_{date}    → {breakfast:[], lunch:[], dinner:[]}
 *  fwms_feedbacks      → Array<FeedbackRecord>
 *  fwms_initialized    → Boolean
 *
 * SubmissionRecord.breakfast/lunch/dinner:
 *  { selected, items:[{name, qty}], cancelled, cancelledAt }
 * ============================================================
 */

const DB = {
  PREFIX: 'fwms_',

  /* --------------------------------------------------
     INIT — seed demo data on first load
  -------------------------------------------------- */
  init() {
    if (this.get('initialized')) return;

    /* Demo students — includes class & branch */
    this.set('students', [
      { regNo: 'RA2411026020306', name: 'Demo Student',   class: '2nd Year', branch: 'CSE',  room: 'A-101', password: '1234'       },
      { regNo: 'RA2411026020001', name: 'Arjun Kumar',    class: '3rd Year', branch: 'ECE',  room: 'A-102', password: 'arjun123'   },
      { regNo: 'RA2411026020002', name: 'Priya Singh',    class: '2nd Year', branch: 'IT',   room: 'B-201', password: 'priya123'   },
      { regNo: 'RA2411026020003', name: 'Rahul Sharma',   class: '1st Year', branch: 'MECH', room: 'C-301', password: 'rahul123'   },
      { regNo: 'RA2411026020004', name: 'Anjali Verma',   class: '4th Year', branch: 'EEE',  room: 'D-401', password: 'anjali123'  },
      { regNo: 'RA2411026020005', name: 'Karthik Raj',    class: '3rd Year', branch: 'CIVIL',room: 'E-501', password: 'karthik123' },
    ]);

    /* Demo staff */
    this.set('staff', [
      { username: 'staff', password: 'staff123', name: 'Mess Incharge',   role: 'Mess Manager'  },
      { username: 'admin', password: 'admin123', name: 'Dr. Pradeep Kumar', role: 'Administrator' },
    ]);

    /* Default menu */
    const defaultMenu = {
      breakfast: ['Dosa', 'Idly', 'Poha', 'Upma'],
      lunch:     ['Rice', 'Dal', 'Sambar', 'Chutney', 'Curd', 'Roti'],
      dinner:    ['Fried Rice', 'Chapathi']
    };
    const today    = this.today();
    const tomorrow = this.tomorrow();
    if (!this.get('menu_' + today))    this.set('menu_' + today,    defaultMenu);
    if (!this.get('menu_' + tomorrow)) this.set('menu_' + tomorrow, defaultMenu);

    /* Pre-populate today's data (cancellation demo) */
    const students = this.get('students');
    const todaySubs = {};
    students.forEach(s => {
      todaySubs[s.regNo] = {
        regNo: s.regNo,
        name:  s.name,
        class: s.class || '',
        branch: s.branch || '',
        breakfast: { selected: true, items: [{ name:'Dosa', qty:2 }, { name:'Idly', qty:4 }], cancelled: false, cancelledAt: null },
        lunch:     { selected: true, items: [{ name:'Rice', qty:1 }, { name:'Dal', qty:1 }, { name:'Sambar', qty:1 }, { name:'Curd', qty:1 }], cancelled: false, cancelledAt: null },
        dinner:    { selected: true, items: [{ name:'Fried Rice', qty:1 }], cancelled: false, cancelledAt: null },
        submittedAt: new Date().toISOString()
      };
    });
    this.set('subs_' + today, todaySubs);
    this.set('initialized', true);
  },

  /* --------------------------------------------------
     CORE GET / SET
  -------------------------------------------------- */
  get(key) {
    try { return JSON.parse(localStorage.getItem(this.PREFIX + key)); }
    catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(this.PREFIX + key, JSON.stringify(value)); }
    catch (e) { console.error('DB.set error:', e); }
  },

  /* --------------------------------------------------
     DATE HELPERS
  -------------------------------------------------- */
  today() {
    return new Date().toISOString().split('T')[0];
  },
  tomorrow() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  },

  /* --------------------------------------------------
     STUDENTS
  -------------------------------------------------- */
  getStudents()       { return this.get('students') || []; },
  getStudent(regNo)   { return this.getStudents().find(s => s.regNo === regNo) || null; },

  /**
   * Register a new student.
   * @returns {string|true} error message string on failure, true on success
   */
  registerStudent({ regNo, name, studentClass, branch, room, password }) {
    const list = this.getStudents();

    /* Validate uniqueness */
    if (list.find(s => s.regNo.toLowerCase() === regNo.toLowerCase())) {
      return 'Registration number already exists.';
    }

    /* Basic validation */
    if (!regNo || !name || !studentClass || !branch || !password) {
      return 'All fields are required.';
    }
    if (password.length < 4) {
      return 'Password must be at least 4 characters.';
    }

    list.push({ regNo, name, class: studentClass, branch, room: room || 'N/A', password });
    this.set('students', list);
    return true;
  },

  /* --------------------------------------------------
     AUTH
  -------------------------------------------------- */
  loginStudent(regNo, password) {
    const student = this.getStudent(regNo);
    if (student && student.password === password) {
      this.set('currentUser', { ...student, type: 'student', loginAt: new Date().toISOString() });
      return student;
    }
    return null;
  },

  loginStaff(username, password) {
    const staff = (this.get('staff') || []).find(s => s.username === username && s.password === password);
    if (staff) {
      this.set('currentStaff', { ...staff, type: 'staff', loginAt: new Date().toISOString() });
      return staff;
    }
    return null;
  },

  getCurrentUser()  { return this.get('currentUser');  },
  getCurrentStaff() { return this.get('currentStaff'); },
  logoutStudent()   { localStorage.removeItem(this.PREFIX + 'currentUser');  },
  logoutStaff()     { localStorage.removeItem(this.PREFIX + 'currentStaff'); },

  /* --------------------------------------------------
     SUBMISSIONS (items stored as [{name, qty}])
  -------------------------------------------------- */
  getSubmissions(date)         { return this.get('subs_' + date) || {}; },
  getSubmission(date, regNo)   { return this.getSubmissions(date)[regNo] || null; },
  getSubmissionsArray(date)    { return Object.values(this.getSubmissions(date)); },

  saveSubmission(date, regNo, data) {
    const subs = this.getSubmissions(date);
    subs[regNo] = { ...data, updatedAt: new Date().toISOString() };
    this.set('subs_' + date, subs);
  },

  /* --------------------------------------------------
     MEAL CANCELLATION
  -------------------------------------------------- */
  cancelMeal(date, regNo, meal) {
    const subs = this.getSubmissions(date);
    if (!subs[regNo] || !subs[regNo][meal]) return false;
    subs[regNo][meal].cancelled   = true;
    subs[regNo][meal].cancelledAt = new Date().toISOString();
    this.set('subs_' + date, subs);
    return true;
  },

  uncancelMeal(date, regNo, meal) {
    const subs = this.getSubmissions(date);
    if (!subs[regNo] || !subs[regNo][meal]) return false;
    subs[regNo][meal].cancelled   = false;
    subs[regNo][meal].cancelledAt = null;
    this.set('subs_' + date, subs);
    return true;
  },

  /* --------------------------------------------------
     MENU
  -------------------------------------------------- */
  getMenu(date) {
    return this.get('menu_' + date) || {
      breakfast: ['Dosa', 'Idly'],
      lunch:     ['Rice', 'Dal', 'Sambar', 'Chutney', 'Curd'],
      dinner:    ['Fried Rice', 'Chapathi']
    };
  },
  setMenu(date, menu) { this.set('menu_' + date, menu); },

  /* --------------------------------------------------
     FEEDBACK
  -------------------------------------------------- */
  saveFeedback(regNo, data) {
    const list = this.get('feedbacks') || [];
    list.push({ id: Date.now(), regNo, ...data, submittedAt: new Date().toISOString() });
    this.set('feedbacks', list);
  },
  saveMealFeedback(regNo, date, meal, rating, comment) {
    const list = this.get('feedbacks') || [];
    list.push({
        id: Date.now() + Math.floor(Math.random() * 1000),
        regNo, date, meal, rating, comment,
        submittedAt: new Date().toISOString()
    });
    this.set('feedbacks', list);
  },
  getFeedbacks() { return this.get('feedbacks') || []; }
};

// ---- models/User.js : add inside the existing UserSchema definition --------------------------
// All fields optional; empty string / missing = "not set". Nothing else in the schema changes,
// so existing documents keep working (no migration needed — they simply have no socialLinks yet).
socialLinks: {
  instagram: { type: String, trim: true, maxlength: 300, default: '' },
  facebook:  { type: String, trim: true, maxlength: 300, default: '' },
  x:         { type: String, trim: true, maxlength: 300, default: '' },   // existing key name kept
  youtube:   { type: String, trim: true, maxlength: 300, default: '' },
  linkedin:  { type: String, trim: true, maxlength: 300, default: '' },
  goodreads: { type: String, trim: true, maxlength: 300, default: '' },
  website:   { type: String, trim: true, maxlength: 300, default: '' },
},

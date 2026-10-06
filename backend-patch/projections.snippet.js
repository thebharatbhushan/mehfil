// ---- Public vs private projections ----------------------------------------------------------------
// PUBLIC (any visitor):   include socialLinks.   NEVER include: password, dob, email, tokens, reset fields.
const PUBLIC_USER_FIELDS = '_id username firstName lastName profilePic bio city state country languagePref ' +
                           'literaryInterests languages createdAt socialLinks';
// Use it on: GET /api/auth/user/:id, GET /api/auth/featured-writers, GET /api/auth/weekly-writer,
//            GET /api/auth/selected-poem (author), poem list/detail `.populate('author', PUBLIC_USER_FIELDS)`,
//            and the user list used by /poets.  e.g.  User.find(q).select(PUBLIC_USER_FIELDS)

// OWN PROFILE (GET /api/auth/profile, login/signup response, PUT /api/auth/profile response):
//   `-password` only. dob is returned here because the birthday greeting reads it for the logged-in user.

// ADMIN (GET /api/admin/users/:id and the admin editor): `-password`; include socialLinks, dob, email.
//   Admin edit endpoint: run req.body.socialLinks through validateSocialForm exactly like the route above.

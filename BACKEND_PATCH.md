# Mehfil — backend & admin changes needed

The zip I received contained only the Next.js frontend (the API runs separately at
`NEXT_PUBLIC_API_URL`, default `https://mehfilbackend.onrender.com`), and the admin panel isn't in it.
So the backend/admin parts are delivered as drop-in code in `backend-patch/`. **Until these are applied,
the frontend works but links won't persist** (the server will ignore unknown fields).

| Step | File | What to do |
|---|---|---|
| 1 | `backend-patch/socialLinks.js` | Copy to `utils/socialLinks.js`. Same validator as the frontend (http/https only, platform host allow-list, no `javascript:`/`data:`). |
| 2 | `backend-patch/user.model.snippet.js` | Add the `socialLinks` sub-document to the User schema. No migration — old users just have no links. |
| 3 | `backend-patch/profile.route.snippet.js` | In `PUT /api/auth/profile`, validate + save `socialLinks`. Empty string removes a link; omitted keys are untouched. |
| 4 | `backend-patch/projections.snippet.js` | Return `socialLinks` from every public user/author response (user-by-id, featured-writers, weekly-writer, selected-poem author, poem `populate('author')`, the /poets user list). Never return `dob`/`email`/password publicly. |
| 5 | Admin panel | Show `socialLinks` in the user-details view; if it has a user editor, pass `socialLinks` through the same `validateSocialForm`. |

## Privacy checks to run on your backend
* `GET /api/admin/users` is called by the public `/poets` page **without a token**. Confirm it does not return
  `dob`, `email` or other private fields (use `PUBLIC_USER_FIELDS`), or protect it / add a public list endpoint.
* Own-profile responses (`GET /api/auth/profile`, login) must include `dob` — the birthday greeting reads it
  for the logged-in user only. No public endpoint should include it.
* The app has no "DOB privacy" setting today, so none is applied; the greeting uses only the user's own data.

---

# Feedback + Contact

Backend + admin for these are in the separate backend/admin zips (ESM, matching the existing code):
`models/Feedback.js`, `models/ContactMessage.js`, `controllers/messageController.js`,
`routes/messageRoutes.js` (public `POST /api/feedback`, `POST /api/contact`),
`routes/adminMessageRoutes.js` (`/api/admin/feedback|contact`, no key — same as the other admin routes).

// ---- routes/auth.js : inside the existing  PUT /api/auth/profile  handler -----------------------
const { validateSocialForm, SOCIAL_KEYS } = require('../utils/socialLinks');

// The frontend sends JSON { socialLinks: {...} }. If a multipart request ever carries it, it arrives as a JSON string.
let incoming = req.body.socialLinks;
if (typeof incoming === 'string') { try { incoming = JSON.parse(incoming); } catch { incoming = undefined; } }

if (incoming !== undefined) {
  if (incoming === null || typeof incoming !== 'object' || Array.isArray(incoming)) {
    return res.status(400).json({ success: false, message: 'अमान्य सोशल लिंक।' });
  }
  const checked = validateSocialForm(incoming);            // re-validates + normalises (http/https only, host allow-list)
  if (!checked.ok) {
    return res.status(400).json({ success: false, message: Object.values(checked.errors)[0], errors: checked.errors });
  }
  // Only the keys the client actually sent are touched, so an update of the bio never wipes the links.
  for (const key of SOCIAL_KEYS) {
    if (key in incoming) user.set(`socialLinks.${key}`, checked.values[key]);   // '' = removed
  }
}
// ...then the existing `await user.save()` and response. Make sure the response user includes socialLinks and dob (own profile only).

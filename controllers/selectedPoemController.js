import SelectedPoem from "../models/SelectedPoem.js";
import Poem from "../models/Poem.js";
import cloudinary from "../config/cloudinary.js";
import { isSuspended } from "../services/suspension.js";

const serialize = (poem, image = "") => {
  if (!poem) return null;
  return {
    _id: poem._id,
    title: poem.title || "",
    body: poem.body || "",
    slug: poem.slug || "",
    category: poem.category || "",
    createdAt: poem.createdAt,
    selectedImage: image || "",
    author: poem.author ? {
      _id: poem.author._id,
      firstName: poem.author.firstName || "",
      lastName: poem.author.lastName || "",
      username: poem.author.username || "",
      profilePic: poem.author.profilePic || "",
      bio: poem.author.bio || "",
    } : null,
  };
};

const populateSelected = (query) => query.populate({
  path: "poem",
  populate: { path: "author", select: "firstName lastName username profilePic bio" },
});

export const getSelectedPoem = async (req, res) => {
  try {
    const config = await populateSelected(SelectedPoem.findOne().sort({ updatedAt: -1 })).lean();
    if (!config?.poem || (await isSuspended(config.poem.author?._id))) return res.json({ success: true, configured: false, poem: null });
    return res.json({ success: true, configured: true, poem: serialize(config.poem, config.image) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getSelectedPoemAdmin = async (req, res) => {
  try {
    const config = await populateSelected(SelectedPoem.findOne().sort({ updatedAt: -1 })).lean();
    res.json({
      success: true,
      configured: !!config?.poem,
      poemId: config?.poem?._id || null,
      image: config?.image || "",
      poem: config?.poem || null,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const saveSelectedPoem = async (req, res) => {
  try {
    const { poemId } = req.body;
    if (!poemId) return res.status(400).json({ success: false, message: "poemId is required" });

    const poem = await Poem.findById(poemId).select("_id title body slug category createdAt author");
    if (!poem) return res.status(404).json({ success: false, message: "Poem not found" });

    const existing = await SelectedPoem.findOne().sort({ updatedAt: -1 });
    let image = existing?.image || "";

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "mehfil/selectedPoem",
        resource_type: "image",
      });
      image = result.secure_url;
    }

    await SelectedPoem.findOneAndUpdate(
      {},
      { $set: { poem: poem._id, image } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    );

    res.json({ success: true, message: "Selected poem saved", poemId: poem._id, image });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const clearSelectedPoem = async (req, res) => {
  try {
    await SelectedPoem.deleteMany({});
    res.json({ success: true, message: "Selected poem cleared" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

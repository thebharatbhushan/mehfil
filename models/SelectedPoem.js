import mongoose from "mongoose";

const selectedPoemSchema = new mongoose.Schema({
  poem: { type: mongoose.Schema.Types.ObjectId, ref: "Poem", required: true },
  image: { type: String, default: "" },
}, { timestamps: true });

export default mongoose.model("SelectedPoem", selectedPoemSchema);

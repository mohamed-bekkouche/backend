import Message from "../models/Message.js";

export const getMessages = async (req, res) => {
  try {
    console.log("get message");
    const messages = await Message.find({ patientId: req.params.patientId })
      .sort({ createdAt: 1 })
      .exec();
    res.json({ messages });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

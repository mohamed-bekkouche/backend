import Message from "../models/Message.js";
import Patient from "../models/Patient.js";

export const getMessages = async (req, res) => {
  try {
    const messages = await Message.find({ patientId: req.params.patientId })
      .sort({ createdAt: 1 })
      .exec();
    res.json({ messages });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

export const getConversations = async (req, res) => {
  try {
    const conversations = await Message.aggregate([
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: "$patientId",
          lastMessage: { $first: "$content" },
          lastSender: { $first: "$sender" },
          lastStatus: { $first: "$status" },
          lastCreatedAt: { $first: "$createdAt" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "patient",
        },
      },
      {
        $unwind: {
          path: "$patient",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 0,
          patient: {
            _id: "$patient._id",
            name: "$patient.name",
            email: "$patient.email",
            avatar: "$patient.avatar",
          },
          lastMessage: 1,
          lastSender: 1,
          lastStatus: 1,
          lastCreatedAt: 1,
        },
      },
      {
        $sort: { lastCreatedAt: -1 },
      },
    ]);

    res.status(200).json({ conversations });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
};

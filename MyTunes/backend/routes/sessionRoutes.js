const express = require("express");
const router = express.Router();

const sessionController = require("../controllers/sessionController");
const { authenticateToken } = require("../middleware/auth");

/* SESSION ROUTES (ALL PROTECTED) */

router.use(authenticateToken);

router.post("/", sessionController.createSession);

router.get("/active", sessionController.getActiveSessions);

router.get("/:id", sessionController.getSession);

router.post("/:id/join", sessionController.joinSession);

router.delete("/:id/leave", sessionController.leaveSession);

router.post("/:id/invite", sessionController.inviteToSession);

router.put("/:id/queue", sessionController.updateSessionQueue);

module.exports = router;
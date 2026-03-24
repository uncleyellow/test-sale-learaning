// server/src/controllers/adminController.js

const sheetsService = require('../services/sheetsService');

// Function to get all exams
exports.getExams = async (req, res) => {
    try {
        const exams = await sheetsService.getExams();
        res.status(200).json(exams);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching exams', error });
    }
};

// Function to create a new exam
exports.createExam = async (req, res) => {
    const examData = req.body;
    try {
        const newExam = await sheetsService.createExam(examData);
        res.status(201).json(newExam);
    } catch (error) {
        res.status(500).json({ message: 'Error creating exam', error });
    }
};

// Function to update an existing exam
exports.updateExam = async (req, res) => {
    const { id } = req.params;
    const examData = req.body;
    try {
        const updatedExam = await sheetsService.updateExam(id, examData);
        res.status(200).json(updatedExam);
    } catch (error) {
        res.status(500).json({ message: 'Error updating exam', error });
    }
};

// Function to delete an exam
exports.deleteExam = async (req, res) => {
    const { id } = req.params;
    try {
        await sheetsService.deleteExam(id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Error deleting exam', error });
    }
};

// Function to get statistics
exports.getStatistics = async (req, res) => {
    try {
        const statistics = await sheetsService.getStatistics();
        res.status(200).json(statistics);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching statistics', error });
    }
};
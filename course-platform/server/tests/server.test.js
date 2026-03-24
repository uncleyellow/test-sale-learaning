const request = require('supertest');
const app = require('../src/index'); // Adjust the path as necessary

describe('Server Tests', () => {
    it('should respond with 200 on the root endpoint', async () => {
        const response = await request(app).get('/');
        expect(response.status).toBe(200);
    });

    it('should respond with 404 for non-existent routes', async () => {
        const response = await request(app).get('/non-existent-route');
        expect(response.status).toBe(404);
    });

    // Add more tests for authentication, exams, and admin routes as needed
});
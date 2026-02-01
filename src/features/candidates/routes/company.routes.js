const express = require('express');
const router = express.Router();
const companyController = require('../controllers/company.controller');

// Get all companies with pagination and search
router.get('/', companyController.getCompanies);

// Get company by ID
router.get('/:companyId', companyController.getCompanyById);

// Create or update company
router.post('/', companyController.upsertCompany);

module.exports = router;

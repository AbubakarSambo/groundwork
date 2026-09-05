-- Removes only what was seeded as sample data. Nothing else is touched.
DELETE FROM ops_activities WHERE company_id IN (SELECT id FROM ops_companies WHERE key LIKE 'sample-co-%');
DELETE FROM ops_commercial_payments WHERE opportunity_id IN (SELECT id FROM ops_commercial_opportunities WHERE company_id IN (SELECT id FROM ops_companies WHERE key LIKE 'sample-co-%'));
DELETE FROM ops_attribution_claims WHERE opportunity_id IN (SELECT id FROM ops_commercial_opportunities WHERE company_id IN (SELECT id FROM ops_companies WHERE key LIKE 'sample-co-%'));
DELETE FROM ops_commercial_opportunities WHERE company_id IN (SELECT id FROM ops_companies WHERE key LIKE 'sample-co-%');
DELETE FROM ops_deployments WHERE company_id IN (SELECT id FROM ops_companies WHERE key LIKE 'sample-co-%');
DELETE FROM ops_client_use_cases WHERE company_id IN (SELECT id FROM ops_companies WHERE key LIKE 'sample-co-%');
DELETE FROM ops_attributions WHERE company_id IN (SELECT id FROM ops_companies WHERE key LIKE 'sample-co-%');
DELETE FROM ops_companies WHERE key LIKE 'sample-co-%';
DELETE FROM ops_periods WHERE key = 'sample-list-delete-me';
DELETE FROM ops_roadmap_items WHERE title LIKE 'Sample:%';
DELETE FROM ops_expenses WHERE description LIKE 'Sample %';
DELETE FROM ops_earnings_entries WHERE source LIKE 'Sample %';
DELETE FROM ops_resource_requests WHERE support_needed LIKE 'Sample:%';

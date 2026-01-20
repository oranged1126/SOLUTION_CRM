const { supabase } = require('../../lib/supabase');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // GET: 모든 프로젝트 조회
    if (req.method === 'GET') {
        try {
            const { status } = req.query;

            let query = supabase
                .from('projects')
                .select('*')
                .order('created_at', { ascending: false });

            if (status === 'new') {
                query = query.eq('status', 'new').is('assigned_to', null);
            } else if (status) {
                query = query.eq('status', status);
            }

            const { data, error } = await query;

            if (error) {
                return res.status(500).json({ error: error.message });
            }

            return res.status(200).json(data);
        } catch (error) {
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    // POST: 프로젝트 생성 (테스트용)
    if (req.method === 'POST') {
        try {
            const projectData = req.body;

            const { data, error } = await supabase
                .from('projects')
                .insert([{
                    site_name: projectData.siteName,
                    construction_type: projectData.constructionType,
                    building_type: projectData.buildingType,
                    address: projectData.address,
                    units: projectData.units,
                    customer_type: projectData.customerType,
                    contact: projectData.contact,
                    contact_name: projectData.contactName,
                    source: projectData.source,
                    inquiry: projectData.inquiry,
                    memo: projectData.memo || {},
                    status: 'new',
                    assigned_to: null,
                    checklist: {},
                    task_details: {},
                    created_at: new Date().toISOString()
                }])
                .select();

            if (error) {
                return res.status(500).json({ error: error.message });
            }

            return res.status(201).json(data[0]);
        } catch (error) {
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
};

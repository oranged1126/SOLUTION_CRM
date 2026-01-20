const { supabase } = require('../lib/supabase');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { employeeId } = req.query;

    if (!employeeId) {
        return res.status(400).json({ error: 'employeeId is required' });
    }

    if (req.method === 'GET') {
        try {
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .eq('assigned_to', employeeId)
                .in('status', ['assigned'])
                .order('assigned_at', { ascending: false });

            if (error) {
                return res.status(500).json({ error: error.message });
            }

            return res.status(200).json(data || []);
        } catch (error) {
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
};

const { supabase } = require('../../lib/supabase');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { id, status } = req.query;

    // GET: 프로젝트 조회
    if (req.method === 'GET') {
        try {
            // 특정 프로젝트 조회 (id가 있을 때)
            if (id) {
                const { data, error } = await supabase
                    .from('projects')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) {
                    return res.status(404).json({ error: 'Project not found' });
                }
                return res.status(200).json(data);
            }

            // 전체 프로젝트 조회
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

    // PUT: 프로젝트 수정 (id 필수)
    if (req.method === 'PUT') {
        if (!id) {
            return res.status(400).json({ error: 'id is required' });
        }

        try {
            const updates = req.body;
            const updateData = {};

            // 담당자 배정
            if (updates.assignedTo !== undefined) {
                updateData.assigned_to = updates.assignedTo;
                updateData.status = 'assigned';
                updateData.assigned_at = new Date().toISOString();
            }

            // 체크리스트 업데이트
            if (updates.checklist !== undefined) {
                updateData.checklist = updates.checklist;
            }

            // 완료 처리
            if (updates.status === 'completed') {
                updateData.status = 'completed';
                updateData.completed_at = new Date().toISOString();
            }

            // 중단 처리
            if (updates.status === 'cancelled') {
                updateData.status = 'cancelled';
                updateData.cancel_reason = updates.reason;
                updateData.cancelled_at = new Date().toISOString();
            }

            // 업무 상세 저장
            if (updates.taskDetails !== undefined) {
                updateData.task_details = updates.taskDetails;
            }

            const { data, error } = await supabase
                .from('projects')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

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

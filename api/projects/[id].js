const { supabase } = require('../../lib/supabase');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { id } = req.query;

    // GET: 특정 프로젝트 조회
    if (req.method === 'GET') {
        try {
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                return res.status(404).json({ error: 'Project not found' });
            }

            return res.status(200).json(data);
        } catch (error) {
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    // PUT: 프로젝트 수정
    if (req.method === 'PUT') {
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

    return res.status(405).json({ error: 'Method not allowed' });
};

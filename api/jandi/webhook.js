const { supabase } = require('../../lib/supabase');

// 잔디 메시지 파싱 함수
function parseJandiMessage(text) {
    const lines = text.split('\n');
    const data = {
        siteName: '',
        constructionType: '',
        buildingType: '',
        address: '',
        units: '',
        customerType: '',
        contact: '',
        contactName: '',
        source: '',
        inquiry: '',
        memo: {}
    };

    let currentSection = 'main';
    let inquiryLines = [];

    for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed.startsWith('현장 :')) {
            data.siteName = trimmed.replace('현장 :', '').trim();
        } else if (trimmed.startsWith('건물유형 :')) {
            data.buildingType = trimmed.replace('건물유형 :', '').trim();
        } else if (trimmed.startsWith('주소 :')) {
            data.address = trimmed.replace('주소 :', '').trim();
        } else if (trimmed.startsWith('단지개요 :')) {
            data.units = trimmed.replace('단지개요 :', '').trim();
        } else if (trimmed.startsWith('고객유형 :')) {
            data.customerType = trimmed.replace('고객유형 :', '').trim();
        } else if (trimmed.startsWith('연락처 :')) {
            data.contact = trimmed.replace('연락처 :', '').trim();
        } else if (trimmed.startsWith('담당자 :')) {
            data.contactName = trimmed.replace('담당자 :', '').trim();
        } else if (trimmed.startsWith('유입경로 :')) {
            data.source = trimmed.replace('유입경로 :', '').trim();
        } else if (trimmed.startsWith('문의내용 :')) {
            currentSection = 'inquiry';
            const content = trimmed.replace('문의내용 :', '').trim();
            if (content) inquiryLines.push(content);
        } else if (trimmed.startsWith('내부메모') || trimmed.startsWith('[ 내부메모')) {
            currentSection = 'memo';
        } else if (trimmed.startsWith('공사유형 :') || trimmed.startsWith('공사유형:')) {
            data.constructionType = trimmed.replace('공사유형 :', '').replace('공사유형:', '').trim();
            data.memo.constructionType = data.constructionType;
        } else if (trimmed.startsWith('예정시기 :') || trimmed.startsWith('예정시기:')) {
            data.memo.expectedDate = trimmed.replace('예정시기 :', '').replace('예정시기:', '').trim();
        } else if (trimmed.startsWith('특이사항 :') || trimmed.startsWith('특이사항:')) {
            data.memo.note = trimmed.replace('특이사항 :', '').replace('특이사항:', '').trim();
        } else if (currentSection === 'inquiry' && trimmed && !trimmed.startsWith('[')) {
            inquiryLines.push(trimmed);
        }
    }

    data.inquiry = inquiryLines.join(' ');

    return data;
}

module.exports = async (req, res) => {
    // CORS 헤더
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const jandiData = req.body;

        // 잔디 웹훅 데이터 구조
        // { token, teamName, roomName, writerName, text, ... }
        const messageText = jandiData.text || jandiData.data?.content || '';

        if (!messageText) {
            return res.status(400).json({ error: 'No message text found' });
        }

        // 메시지 파싱
        const projectData = parseJandiMessage(messageText);

        // Supabase에 저장
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
                memo: projectData.memo,
                status: 'new',
                assigned_to: null,
                checklist: {},
                task_details: {},
                created_at: new Date().toISOString()
            }])
            .select();

        if (error) {
            console.error('Supabase error:', error);
            return res.status(500).json({ error: 'Database error', details: error.message });
        }

        console.log('New project created:', data[0].id);

        return res.status(200).json({
            success: true,
            message: 'Project created',
            projectId: data[0].id
        });

    } catch (error) {
        console.error('Webhook error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

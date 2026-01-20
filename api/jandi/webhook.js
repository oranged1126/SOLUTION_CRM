const { supabase } = require('../../lib/supabase');

// 잔디 메시지 파싱 함수 (실제 잔디 형식에 맞춤)
function parseJandiMessage(text) {
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

    // 전화번호 마크다운 링크에서 번호만 추출: [031-896-6626](tel:031-896-6626) -> 031-896-6626
    const extractPhone = (str) => {
        const match = str.match(/\[([^\]]+)\]\(tel:[^)]+\)/);
        return match ? match[1] : str.trim();
    };

    // 내부 메모 섹션 분리
    let mainText = text;
    let memoText = '';

    if (text.includes('--------------------')) {
        const parts = text.split('--------------------');
        mainText = parts[0];
        memoText = parts[1] || '';
    } else if (text.includes('내부 메모)')) {
        const parts = text.split('내부 메모)');
        mainText = parts[0];
        memoText = parts[1] || '';
    }

    // ■ 기준으로 섹션 분리
    const sections = mainText.split('■').map(s => s.trim()).filter(s => s);

    for (const section of sections) {
        // 각 섹션의 첫 번째 줄과 나머지 분리
        const lines = section.split('\n');
        const firstLine = lines[0].trim();
        const restLines = lines.slice(1).map(l => l.trim()).filter(l => l).join('\n');

        if (firstLine.startsWith('현장 :') || firstLine.startsWith('현장:')) {
            data.siteName = firstLine.replace(/현장\s*:\s*/, '').trim();
        } else if (firstLine.startsWith('건물유형 :') || firstLine.startsWith('건물유형:')) {
            data.buildingType = firstLine.replace(/건물유형\s*:\s*/, '').trim();
        } else if (firstLine.startsWith('건물주소 :') || firstLine.startsWith('건물주소:') || firstLine.startsWith('주소 :') || firstLine.startsWith('주소:')) {
            data.address = firstLine.replace(/건물주소\s*:\s*|주소\s*:\s*/, '').trim();
        } else if (firstLine.startsWith('단지개요 :') || firstLine.startsWith('단지개요:')) {
            data.units = firstLine.replace(/단지개요\s*:\s*/, '').trim();
        } else if (firstLine.startsWith('고객유형 :') || firstLine.startsWith('고객유형:')) {
            data.customerType = firstLine.replace(/고객유형\s*:\s*/, '').trim();
        } else if (firstLine.startsWith('연락처(관리사무소)') || firstLine.startsWith('연락처 :') || firstLine.startsWith('연락처:')) {
            const phoneStr = firstLine.replace(/연락처\([^)]*\)\s*:\s*|연락처\s*:\s*/, '').trim();
            data.contact = extractPhone(phoneStr);
        } else if (firstLine.startsWith('연락처 / 성함') || firstLine.startsWith('연락처/성함')) {
            const contactPart = firstLine.replace(/연락처\s*\/\s*성함\s*:\s*/, '').trim();
            const parts = contactPart.split('/');
            if (parts[0]) data.contact = extractPhone(parts[0].trim());
            if (parts[1]) data.contactName = parts[1].trim();
        } else if (firstLine.startsWith('담당자 :') || firstLine.startsWith('담당자:')) {
            data.contactName = firstLine.replace(/담당자\s*:\s*/, '').trim();
        } else if (firstLine.startsWith('유입경로 :') || firstLine.startsWith('유입경로:')) {
            data.source = firstLine.replace(/유입경로\s*:\s*/, '').trim();
        } else if (firstLine.startsWith('문의내용 :') || firstLine.startsWith('문의내용:')) {
            // 문의내용은 첫 줄 + 나머지 줄 모두 포함
            const firstContent = firstLine.replace(/문의내용\s*:\s*/, '').trim();
            data.inquiry = firstContent ? (firstContent + '\n' + restLines).trim() : restLines.trim();
        }
    }

    // 내부 메모 파싱
    if (memoText) {
        const memoSegments = memoText.split(/- |\n/).map(s => s.trim()).filter(s => s);
        for (const seg of memoSegments) {
            if (seg.startsWith('공사유형 :') || seg.startsWith('공사유형:')) {
                data.constructionType = seg.replace(/공사유형\s*:\s*/, '').trim();
                data.memo.constructionType = data.constructionType;
            } else if (seg.startsWith('공사 예정시기 :') || seg.startsWith('공사 예정시기:') || seg.startsWith('예정시기 :') || seg.startsWith('예정시기:')) {
                data.memo.expectedDate = seg.replace(/공사 예정시기\s*:\s*|예정시기\s*:\s*/, '').trim();
            } else if (seg.startsWith('특이사항 :') || seg.startsWith('특이사항:')) {
                data.memo.note = seg.replace(/특이사항\s*:\s*/, '').trim();
            }
        }
    }

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

        // 잔디 Outgoing Webhook 형식
        // text: 전체 메시지 (/현장 포함)
        // data: /현장 제외한 메시지
        const messageText = jandiData.data || jandiData.text || '';

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
// Deploy test 2026년 01월 21일 수 오전  3:12:27

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

    // 필드 값 추출 헬퍼 함수
    const extractValue = (line, pattern) => {
        return line.replace(pattern, '').trim();
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
    const sections = mainText.split(/■|◾|▪|●/).map(s => s.trim()).filter(s => s);

    for (const section of sections) {
        // 각 섹션의 첫 번째 줄과 나머지 분리
        const lines = section.split('\n');
        const firstLine = lines[0].trim();
        const restLines = lines.slice(1).map(l => l.trim()).filter(l => l).join('\n');

        // 정규식으로 필드 매칭 (공백 변형 처리)
        if (/^현장\s*[:：]\s*/i.test(firstLine)) {
            data.siteName = extractValue(firstLine, /^현장\s*[:：]\s*/i);
        } else if (/^건물유형\s*[:：]\s*/i.test(firstLine)) {
            data.buildingType = extractValue(firstLine, /^건물유형\s*[:：]\s*/i);
        } else if (/^(건물)?주소\s*[:：]\s*/i.test(firstLine)) {
            data.address = extractValue(firstLine, /^(건물)?주소\s*[:：]\s*/i);
        } else if (/^단지개요\s*[:：]\s*/i.test(firstLine)) {
            data.units = extractValue(firstLine, /^단지개요\s*[:：]\s*/i);
        } else if (/^고객유형\s*[:：]\s*/i.test(firstLine)) {
            data.customerType = extractValue(firstLine, /^고객유형\s*[:：]\s*/i);
        } else if (/^연락처\s*\([^)]*\)\s*[:：]\s*/i.test(firstLine)) {
            // 연락처(관리사무소) 형식
            const phoneStr = extractValue(firstLine, /^연락처\s*\([^)]*\)\s*[:：]\s*/i);
            data.contact = extractPhone(phoneStr);
        } else if (/^연락처\s*[/／]\s*성함\s*[:：]\s*/i.test(firstLine)) {
            // 연락처 / 성함 형식
            const contactPart = extractValue(firstLine, /^연락처\s*[/／]\s*성함\s*[:：]\s*/i);
            const parts = contactPart.split(/[/／]/);
            if (parts[0]) data.contact = extractPhone(parts[0].trim());
            if (parts[1]) data.contactName = parts[1].trim();
        } else if (/^연락처\s*[:：]\s*/i.test(firstLine)) {
            const phoneStr = extractValue(firstLine, /^연락처\s*[:：]\s*/i);
            data.contact = extractPhone(phoneStr);
        } else if (/^담당자\s*[:：]\s*/i.test(firstLine)) {
            data.contactName = extractValue(firstLine, /^담당자\s*[:：]\s*/i);
        } else if (/^유입경로\s*[:：]\s*/i.test(firstLine)) {
            data.source = extractValue(firstLine, /^유입경로\s*[:：]\s*/i);
        } else if (/^문의내용\s*[:：]\s*/i.test(firstLine)) {
            // 문의내용은 첫 줄 + 나머지 줄 모두 포함
            const firstContent = extractValue(firstLine, /^문의내용\s*[:：]\s*/i);
            data.inquiry = firstContent ? (firstContent + '\n' + restLines).trim() : restLines.trim();
        }
    }

    // 내부 메모 파싱
    if (memoText) {
        const memoLines = memoText.split('\n').map(s => s.trim()).filter(s => s);
        for (const line of memoLines) {
            // 앞의 '- ' 제거
            const cleanLine = line.replace(/^-\s*/, '');

            if (/^공사\s*유형\s*[:：]\s*/i.test(cleanLine)) {
                data.constructionType = extractValue(cleanLine, /^공사\s*유형\s*[:：]\s*/i);
                data.memo.constructionType = data.constructionType;
            } else if (/^(공사\s*)?예정\s*시기\s*[:：]\s*/i.test(cleanLine)) {
                data.memo.expectedDate = extractValue(cleanLine, /^(공사\s*)?예정\s*시기\s*[:：]\s*/i);
            } else if (/^특이사항\s*[:：]\s*/i.test(cleanLine)) {
                data.memo.note = extractValue(cleanLine, /^특이사항\s*[:：]\s*/i);
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
        let jandiData = req.body;

        // req.body가 문자열이면 JSON 파싱 시도
        if (typeof jandiData === 'string') {
            try {
                jandiData = JSON.parse(jandiData);
            } catch (e) {
                // 파싱 실패하면 그대로 사용
            }
        }

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
            projectId: data[0].id,
            parsed: projectData
        });

    } catch (error) {
        console.error('Webhook error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

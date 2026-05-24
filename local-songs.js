/**
 * 本地乐曲数据后备 - 用于 diving-fish API 尚未收录的新曲
 *
 * 当 MusicData.getSongById(id) 在远端找不到时，会回退到此处的数据。
 * 字段格式与 diving-fish music_data 保持一致：
 *   id, title, type, ds[], level[], cids[], basic_info: { title, artist, genre, bpm, release_date, from, is_new }
 *
 * 收录原则：
 *   - 仅包含活动期间需要展示但 diving-fish 还未收录的曲目
 *   - diving-fish 收录后可移除对应条目（远端数据会自动接管）
 */
(function (global) {
    const ENTRIES = [
        {
            id: '11377',
            title: 'パラマウント☆ショータイム！！',
            type: 'DX',
            ds: [5.0, 8.0, 11.7, 14.0],
            level: ['5', '8', '11+', '14'],
            cids: [],
            basic_info: {
                title: 'パラマウント☆ショータイム！！',
                artist: '翡乃イスカ',
                genre: 'maimai',
                bpm: 222,
                release_date: '',
                from: 'maimai でらっくす PRiSM PLUS',
                is_new: true
            }
        },
        {
            id: '11806',
            title: 'Fraq',
            type: 'DX',
            ds: [5.0, 8.5, 12.2, 13.7],
            level: ['5', '8+', '12', '13+'],
            cids: [],
            basic_info: {
                title: 'Fraq',
                artist: 'owl＊tree feat. べんざ',
                genre: 'maimai',
                bpm: 221,
                release_date: '',
                from: 'maimai でらっくす PRiSM PLUS',
                is_new: true
            }
        },
        {
            id: '11807',
            title: 'ウタヒメナイトストーム',
            type: 'DX',
            ds: [4.0, 7.0, 11.5, 13.8],
            level: ['4', '7', '11+', '13+'],
            cids: [],
            basic_info: {
                title: 'ウタヒメナイトストーム',
                artist: 'yowanecity feat.Eye',
                genre: 'maimai',
                bpm: 164,
                release_date: '',
                from: 'maimai でらっくす PRiSM PLUS',
                is_new: true
            }
        },
        {
            id: '11808',
            title: 'Feel The Luv',
            type: 'DX',
            ds: [4.0, 7.7, 11.2, 13.8],
            level: ['4', '7+', '11', '13+'],
            cids: [],
            basic_info: {
                title: 'Feel The Luv',
                artist: 'EmoCosine',
                genre: 'maimai',
                bpm: 155,
                release_date: '',
                from: 'maimai でらっくす PRiSM PLUS',
                is_new: true
            }
        },
        {
            id: '11809',
            title: 'Åntinomiε',
            type: 'DX',
            ds: [6.0, 9.5, 12.8, 14.6],
            level: ['6', '9+', '12+', '14+'],
            cids: [],
            basic_info: {
                title: 'Åntinomiε',
                artist: 'ああ…翡翠茶漬け…',
                genre: 'maimai',
                bpm: 242,
                release_date: '',
                from: 'maimai でらっくす PRiSM PLUS',
                is_new: true
            }
        }
    ];

    const map = new Map(ENTRIES.map(e => [String(e.id), e]));

    function getSongById(id) {
        return map.get(String(id)) || null;
    }

    function listAll() {
        return [...ENTRIES];
    }

    global.LocalSongData = {
        getSongById,
        listAll
    };
})(typeof window !== 'undefined' ? window : globalThis);

"use client"; // Next.js မှာ Client-side အလုပ်လုပ်ဖို့ ဒါလေးထိပ်ဆုံးမှာ ထည့်ရပါတယ်
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Vercel Settings မှာ ထည့်ထားတဲ့ URL နဲ့ Key ကို ခေါ်သုံးတာ
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function TikTokApp() {
  const [videos, setVideos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');

  // ၁။ Database ကနေ Video တွေကို ဆွဲထုတ်ယူမယ်
  const fetchVideos = async () => {
    const { data } = await supabase
      .from('videos')
      .select('*')
      .order('created_at', { ascending: false });
    setVideos(data || []);
  };

  useEffect(() => {
    fetchVideos();

    // ၂။ Real-time Update ဖြစ်အောင်လုပ်တာ (Insert ဖြစ်တိုင်း အလိုအလျောက်ပြမယ်)
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'videos' }, 
        (payload) => {
          setVideos((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // ၃။ Video Upload လုပ်တဲ့ Function
  const handleUpload = async (event) => {
    try {
      setUploading(true);
      const file = event.target.files[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Storage ထဲကို File အရင်ပို့မယ်
      let { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // File ရဲ့ Public URL ကို ယူမယ်
      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(filePath);

      // Database ထဲမှာ URL နဲ့ Caption ကို သွားသိမ်းမယ်
      const { error: dbError } = await supabase
        .from('videos')
        .insert([{ video_url: publicUrl, caption: caption }]);

      if (dbError) throw dbError;
      alert("Video Uploaded Successfully!");
      setCaption('');
      fetchVideos(); // စာရင်းပြန် update ဖြစ်အောင် ခေါ်လိုက်တာ
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#fafafa', minHeight: '100vh' }}>
      <h1 style={{ textAlign: 'center', color: '#ff0050' }}>TikTok Clone</h1>

      {/* Upload Section */}
      <div style={{ marginBottom: '30px', border: '1px solid #ddd', padding: '15px', borderRadius: '10px', backgroundColor: '#fff' }}>
        <input 
          type="text" 
          placeholder="ဗီဒီယိုအကြောင်းရေးပါ..." 
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          style={{ width: '100%', marginBottom: '10px', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
        />
        <input type="file" accept="video/*" onChange={handleUpload} disabled={uploading} style={{ width: '100%' }} />
        {uploading && <p style={{ color: 'blue', marginTop: '10px' }}>Uploading... ခဏစောင့်ပါ...</p>}
      </div>

      <hr />

      {/* Video Feed Section */}
      <div style={{ marginTop: '20px' }}>
        {videos.map((video) => (
          <div key={video.id} style={{ marginBottom: '40px', textAlign: 'center', backgroundColor: '#fff', borderRadius: '15px', padding: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <p style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{video.caption}</p>
            <video 
              src={video.video_url} 
              controls 
              style={{ width: '100%', borderRadius: '15px', backgroundColor: '#000', maxHeight: '500px' }} 
            />
          </div>
        ))}
        {videos.length === 0 && <p style={{ textAlign: 'center' }}>ဗီဒီယိုမရှိသေးပါ။ တစ်ခုခု တင်ကြည့်လိုက်ပါ!</p>}
      </div>
    </div>
  );
                          }


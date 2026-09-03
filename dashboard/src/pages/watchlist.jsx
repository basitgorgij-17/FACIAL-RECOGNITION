import { useState, useEffect } from "react";
import supabase from "../supabaseClient";

function Watchlist() {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [people, setPeople] = useState([]);
  const [editingId, setEditingId] = useState(null); // null = Add mode, id = Edit mode
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPeople();
  }, []);

  async function fetchPeople() {
    const { data, error } = await supabase
      .from("watchlist_persons")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.log("Fetch error:", error);
    } else {
      setPeople(data);
    }
  }

  function resetForm() {
    setName("");
    setCategory("");
    setNotes("");
    setPhotoFile(null);
    setEditingId(null);
  }

  // Edit button click hone par form ko pre-fill karta hai
  function handleEditClick(person) {
    console.log('Edit Clicked For: ', person.id, person.name);
    setEditingId(person.id);
    setName(person.name);
    setCategory(person.category || "");
    setNotes(person.notes || "");
    setPhotoFile(null); // photo dobara choose karna optional hoga
    window.scrollTo({ top: 0, behavior: "smooth" }); // form tak scroll kar do
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting){
      
      console.log('Blocked - already Submitting');
      
      return

    } 
    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    if (editingId) {

      console.log('Going into Updated Branch');
      
      // ===== UPDATE MODE =====
      const { error: updateError } = await supabase
        .from("watchlist_persons")
        .update({ name, category, notes })
        .eq("id", editingId);

      if (updateError) {
        setErrorMsg(updateError.message);
        return;
      }

      // Agar naya photo bhi choose kiya ho, usay bhi upload kar do
      if (photoFile) {
        const filePath = `${editingId}/${photoFile.name}`;

        const { error: uploadError } = await supabase.storage
          .from("watchlist-photos")
          .upload(filePath, photoFile);

        if (uploadError) {
          setErrorMsg(uploadError.message);
          return;
        }

        await supabase
          .from("reference_photos")
          .insert({ person_id: editingId, image_path: filePath });
      }

      setSuccessMsg("Person updated successfully!");
    } else {

      console.log('Going into Add/Insert branch');
      
      // ===== ADD MODE (pehle jaisa) =====
      const { data: personData, error: personError } = await supabase
        .from("watchlist_persons")
        .insert({ name, category, notes })
        .select()
        .single();

      if (personError) {
        setErrorMsg(personError.message);
        return;
      }

      if (photoFile) {
        const filePath = `${personData.id}/${photoFile.name}`;

        const { error: uploadError } = await supabase.storage
          .from("watchlist-photos")
          .upload(filePath, photoFile);

        if (uploadError) {
          setErrorMsg(uploadError.message);
          return;
        }

        await supabase
          .from("reference_photos")
          .insert({ person_id: personData.id, image_path: filePath });
      }

      setSuccessMsg("Person added successfully!");
    }

    resetForm();
    fetchPeople();
    setSubmitting(false);
  }

  async function handleDelete(id) {
  const confirmDelete = window.confirm('Are you sure you want to delete this person?')
  if (!confirmDelete) return

  // Step 1: Us person ki saari reference photos ka path nikalo
  const { data: photos, error: fetchPhotosError } = await supabase
    .from('reference_photos')
    .select('image_path')
    .eq('person_id', id)

  if (fetchPhotosError) {
    console.log('Error fetching photos:', fetchPhotosError)
  }

  // Step 2: Agar photos hain, unhe storage se delete karo
  if (photos && photos.length > 0) {
    const filePaths = photos.map((photo) => photo.image_path)

    const { error: storageDeleteError } = await supabase.storage
      .from('watchlist-photos')
      .remove(filePaths)

    if (storageDeleteError) {
      console.log('Error deleting photos from storage:', storageDeleteError)
    }
  }

  // Step 3: Person ki row delete karo (reference_photos row cascade se khud delete ho jayegi)
  const { error } = await supabase.from('watchlist_persons').delete().eq('id', id)

  if (error) {
    console.log('Delete error:', error)
  } else {
    setPeople(people.filter((person) => person.id !== id))
  }
}

  return (
    <div className="watchlist-page">
      <div className="watchlist-form-wrapper">
        <h1>{editingId ? "Edit Watchlist Person" : "Add Watchlist Person"}</h1>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <label>Category</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />

          <label>Notes</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <label>
            Reference Photo{" "}
            {editingId && "(optional — leave empty to keep existing)"}
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPhotoFile(e.target.files[0])}
          />

          {errorMsg && <p className="error-text">{errorMsg}</p>}
          {successMsg && (
            <p style={{ color: "#4ade80", fontSize: "0.85rem" }}>
              {successMsg}
            </p>
          )}

          <button type="submit" disabled={submitting}>
            {" "}
            {submitting
              ? "Saving..."
              : editingId
                ? "Update Person"
                : "Add Person"}
            {" "}
          </button>

          {editingId && (
            <button type="button" onClick={resetForm} className="cancel-btn">
              Cancel Edit
            </button>
          )}
        </form>
      </div>

      <div className="watchlist-list">
        <h2 className="watchlist-heading">Watchlist ({people.length})</h2>

        {people.length === 0 && (
          <p className="empty-text">No one on the watchlist yet.</p>
        )}

        <div className="watchlist-grid">
          {people.map((person) => (
            <div key={person.id} className="watchlist-card">
              <div className="watchlist-avatar">
                {person.name.charAt(0).toUpperCase()}
              </div>

              <div className="watchlist-info">
                <p className="watchlist-name">{person.name}</p>
                {person.category && (
                  <span className="watchlist-badge">{person.category}</span>
                )}
                {person.notes && (
                  <p className="watchlist-notes">{person.notes}</p>
                )}
              </div>

              <div className="watchlist-actions">
                <button
                  onClick={() => handleEditClick(person)}
                  className="edit-btn"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(person.id)}
                  className="delete-btn"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Watchlist;

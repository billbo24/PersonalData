

 // 1. Adds a new input box to the screen so you can have multiple fields
    function addFieldInput() {
        const container = document.getElementById('fields-input-container');
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'modern-input field-name';
        input.placeholder = 'Field Name';
        input.style.display = 'block';
        input.style.marginTop = '10px';
        container.appendChild(input);
    }

    // 2. Grabs all the names you typed and saves them as a JSON array to Supabase
    async function saveBlueprint() {
        const name = document.getElementById('blueprint-name').value;
        const fieldInputs = document.querySelectorAll('.field-name');
        
        // Convert the list of inputs into a simple array of strings: ["Route", "Traffic"]
        const fieldsArray = Array.from(fieldInputs)
                                .map(input => input.value)
                                .filter(val => val !== "");

        const { data: { user } } = await db.auth.getUser();

        const { error } = await db
            .from('activity_blueprint')
            .insert([{ 
                display_name: name, 
                fields: fieldsArray, 
                user_id: user.id 
            }]);

        if (error) {
            alert("Error saving blueprint: " + error.message);
        } else {
            alert("Blueprint saved! Refresh to see it (for now).");
            location.reload(); // Temporary way to refresh the list
        }
    }




    // 1. Initialize the Connection
    const supabaseUrl = 'https://wvyqzegrmdaiqdaaoagi.supabase.co'
    const supabaseKey = 'sb_publishable_7mu-hisYvIztWbt9miXpmA_OfQGNnVL'
    const db = supabase.createClient(supabaseUrl, supabaseKey)
        

    let allBlueprints = []; // We'll store them here to use later

    // 1. Fetch Blueprints and fill the dropdown
    async function loadBlueprints() {
        const { data, error } = await db.from('activity_blueprint').select('*');
        if (error) return console.error(error);
        
        allBlueprints = data;
        const selector = document.getElementById('activity-selector');
        
        // Clear old options and add the new ones
        selector.innerHTML = '<option value="">-- Select an Activity --</option>';
        data.forEach(bp => {
            const opt = document.createElement('option');
            opt.value = bp.id;
            opt.textContent = bp.display_name;
            selector.appendChild(opt);
        });
    }


    // --- NEW LOGIN FUNCTIONS ---
        
    // Function to show/hide the tracker based on if you're logged in
    async function checkUser() {
        const { data: { user } } = await db.auth.getUser();
        if (user) {
            document.getElementById('login-section').style.display = 'none';
            document.getElementById('tracker-section').style.display = 'block';
            loadBlueprints();
        } else {
            document.getElementById('login-section').style.display = 'block';
            document.getElementById('tracker-section').style.display = 'none';
        }
    }

    async function handleLogin() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        const { data, error } = await db.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            alert("Login failed: " + error.message);
        } else {
            checkUser(); // Refresh the UI
        }
    }

    async function handleLogout() {
        await db.auth.signOut();
        checkUser();
    }


    // 4. Data Tracking Function
    async function trackActivity(name) {
        console.log("Tracking:", name);
        
        const { data, error } = await db
            .from('Activities') // Make sure this matches your table name exactly!
            .insert([{ activity_name: name }]);

        if (error) {
            alert("Error saving activity: " + error.message);
        } else {
            alert("Successfully tracked: " + name);
        }
    }

 




    // 2. The "Generator" - Runs when you pick an activity
    function generateDynamicForm() {
        const selectedId = document.getElementById('activity-selector').value;
        const container = document.getElementById('dynamic-inputs-container');
        const inputArea = document.getElementById('dynamic-inputs');
        const title = document.getElementById('current-activity-title');

        if (!selectedId) {
            container.style.display = 'none';
            return;
        }

        // Find the blueprint details
        const blueprint = allBlueprints.find(b => b.id == selectedId); //This is define above and gets populated when we login using the loadBlueprints() function
        title.textContent = blueprint.display_name;
        inputArea.innerHTML = ''; // Clear previous inputs

        // LOOP: For every field in the blueprint, create a label and input
        blueprint.fields.forEach(fieldName => {
            const group = document.createElement('div');
            group.style.marginBottom = '10px';
            
            // We define the width of these inputs in the actual HTML, making it take up a percentage of the page.  This looks much better imo
            //Adding dynamic-field to the class of teh text input means it can be found by the submit button
            group.innerHTML = `
                <label style="display:block; font-size: 0.9em;">${fieldName}</label>
                <input type="text" class="modern-input dynamic-field" data-fieldname="${fieldName}" > 
            `;
            inputArea.appendChild(group);
        });

        container.style.display = 'block';
    }               

    async function submitDynamicEntry() {
        const selectedId = document.getElementById('activity-selector').value;
        const blueprint = allBlueprints.find(b => b.id == selectedId);
        
        // 1. Collect all the data from the dynamic inputs
        const entryData = {};
        const inputs = document.querySelectorAll('.dynamic-field');
        
        inputs.forEach(input => {
            const fieldName = input.getAttribute('data-fieldname');
            entryData[fieldName] = input.value;
        });

        // 2. Get the current user
        const { data: { user } } = await db.auth.getUser();

        // 3. Send it to Supabase
        // We save the activity name and the flexible 'entry_data' object
        const { error } = await db
            .from('Activities') // Double check if yours is 'Activities' or 'activities'
            .insert([{ 
                activity_name: blueprint.display_name,
                entry_data: entryData // This is your JSON object
            }]);

        if (error) {
            alert("Error saving entry: " + error.message);
        } else {
            alert(`Successfully saved ${blueprint.display_name}!`);
            // Optional: clear the inputs
            inputs.forEach(i => i.value = "");

        }
    }


            // This will pull all the data for a selected field
            async function filterLogs() {
            const selectedActivity = document.getElementById('activity-dropdown').value;
            const container = document.getElementById('log-display-section');
            console.log("Function triggered!")
            console.log(selectedActivity)
            // 1. Get the current user
            const { data: { user } } = await db.auth.getUser();

            // 2. The "Select * Where" logic
            const { data: logs, error } = await db
                .from('Activities')
                .select('*')
                .eq('user_id', user.id) // Must be yours
                .eq('activity_name', selectedActivity) // Must match the dropdown
                .order('created_at', { ascending: false });

            if (error) return console.error(error);

            // 3. Wipe and Redraw
            container.innerHTML = `<h4>History for ${selectedActivity}</h4>`;
            
            if (logs.length === 0) {
                container.innerHTML += '<p>No entries found.</p>';
                return;
            }

            logs.forEach(row => {
                container.innerHTML += `
                    <div class="log-item">
                        <strong>Count:</strong> ${row.count} | 
                        <span>${new Date(row.created_at).toLocaleDateString()}</span>
                    </div>`;
            });
        }


       // 5. Kick everything off when the page loads
       checkUser();

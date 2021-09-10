# Trip planning implementation

See the live website on https://trip-planning-optimization.herokuapp.com/.


Heroku deployment related commands:

# View logging
heroku logs --tail
# Run locally
heroku local web
# Install new dependency
npm install cool-ascii-faces
# Test locally
npm install
heroku local
# Deploy each change
git add .
git commit -m "My commit message"
pushheroku
# Update index
python3 build_index.py && python3 copy_index_to_db.py

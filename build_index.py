import json

def try_replace(x, delim=''):
    if not x:
        return ''
    return x.replace(',', delim)

counter = 0
# Business data credit: https://www.yelp.com/dataset/documentation/main.
# Only business data are used, no personal review information is necessary.
with open('/Users/swzheng/Downloads/yelp_dataset/yelp_academic_dataset_business.json', 'r') as fin, open('index.csv', 'w') as fout:
    for json_line in fin.readlines():
        if counter % 10000 == 0:
            print('%d records inserted' % counter)
        counter += 1
        business_obj = json.loads(json_line)
        fout.write('%s,%s,%s,%f,%f,%s\n' % (
            try_replace(business_obj['name']),
            try_replace(business_obj['address']),
            try_replace(business_obj['city']),
            business_obj['latitude'],
            business_obj['longitude'],
        try_replace(business_obj['categories'], '.')))

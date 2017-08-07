from fabric.api import local, lcd, get, env
from fabric.operations import require, prompt
from fabric.utils import abort
import requests
import rdflib
from rdflib.plugins.stores.sparqlstore import SPARQLUpdateStore
from rdflib.plugins.stores.sparqlstore import SPARQLUpdateStore, _node_to_sparql, SPARQL_NS, _node_from_result
import getpass
import urllib2
import os.path
import os
import setlr
from os import listdir
from rdflib import *

def node_to_sparql(node):
    if isinstance(node, BNode):
        return '<bnode:b%s>' % node
    return _node_to_sparql(node)

def node_from_result(node):
    if node.tag == '{%s}uri' % SPARQL_NS and node.text.startswith("bnode:"):
        return BNode(node.text.replace("bnode:",""))
    else:
        return _node_from_result(node)
    
def endpoint(endpoint):
    defaultgraph = None
    store = SPARQLUpdateStore(queryEndpoint=endpoint,
                              update_endpoint=endpoint,
                              node_to_sparql=node_to_sparql,
                              node_from_result=node_from_result)
    graph = ConjunctiveGraph(store,defaultgraph)
    return graph

XML_DIR='xml/'
OUTPUT_DIR='nanopublications/'
SETL_FILE='xml.setl.ttl'
PROCESS_FILE_COUNT=None
#PROCESS_FILE_COUNT=20

setl = Namespace('http://purl.org/twc/vocab/setl/')
prov = Namespace('http://www.w3.org/ns/prov#')
dc = Namespace('http://purl.org/dc/terms/')
pv = Namespace('http://purl.org/net/provenance/ns#')

import time
import requests, json, os
import dicttoxml
from xml.dom.minidom import parseString
import codecs


current_schema_objectID = '5904922ce74a1d36e1b78b7f' # 042917

def download_xml():
    '''
    Connect to API via URL and grab json and xml files for given schemaID. 
    '''

    # create dirs if not exist
    for directory in ['json_api', XML_DIR]:
        if not os.path.exists(directory):
            os.makedirs(directory)

    # API backup
    MDCS_URL = "http://129.105.90.149:8000"

    url = MDCS_URL + "/rest/explore/select/all"
    payload = {'dataformat':'json'}
    r = requests.get(url, params=payload)
    data = r.json()

    ct = 0
    for doc in data:
        ct += 1
        title = doc['title']
        schema = doc[u'schema']
        if schema == current_schema_objectID: 
            id = doc[u'_id']

            # save json 
            with open('./json_api/json-'+str(title)+'.json', 'w+') as outfile:
                json.dump(doc['content'], outfile)

            # convert to xml 
            data_xml = dicttoxml.dicttoxml(doc['content']['PolymerNanocomposite'], custom_root='PolymerNanocomposite',attr_type=False)

            # save 
            xml_path = XML_DIR+str(title)
            with codecs.open(xml_path, 'w', "utf-8") as _f:
                _f.write("%s\n" % (parseString(data_xml).toprettyxml())[23:])

    print 'total number of docs: ' + str(ct)

def convert_xml(debug=None):
    setl_graph = Graph()
    setl_graph.load(SETL_FILE,format="turtle")
    cwd = os.getcwd()
    if debug:
        files = [debug]
    else:
        files = os.listdir(XML_DIR)[:PROCESS_FILE_COUNT]
    for filename in files:
        try:
            print 'Processing', filename
            local_setl_graph = Graph()
            local_setl_graph += setl_graph
            input_file_resource = local_setl_graph.resource(URIRef('http://nanomine.tw.rpi.edu/setl/xml/nanomine_xml'))
            input_file_resource.value(prov.wasGeneratedBy).set(prov.used, URIRef('file://'+XML_DIR+filename))

            output_file_resource = local_setl_graph.resource(URIRef(OUTPUT_DIR+filename.replace('.xml','.trig')))
            output_file_resource.set(prov.used, URIRef('file://'+OUTPUT_DIR+filename))
            output_file_resource.set(dc['format'], Literal('trig'))
            output_file_resource.set(RDF.type,pv.File)
            generated_by = local_setl_graph.resource(BNode())
            output_file_resource.set(prov.wasGeneratedBy, generated_by)
            generated_by.set(RDF.type, setl.Load)
            generated_by.set(prov.used, URIRef('http://nanomine.tw.rpi.edu/setl/xml/nanopubs'))
    
            resources = setlr._setl(local_setl_graph)
            for identifier, graph in resources.items():
                if hasattr(graph, 'close'):
                    print "Closing",identifier
                    graph.close()
        except Exception as e:
            print e

def upload_nanopubs():
    db = endpoint('http://nanomine.northwestern.edu:8001/blazegraph/sparql')
    files = os.listdir(OUTPUT_DIR)[:PROCESS_FILE_COUNT]
    prefix = Namespace("http://nanomine.tw.rpi.edu/entry/")
    for filename in files:
        print "Loading", filename
        identifier = filename.replace(".trig","").replace(" ",'')
        for context in [prefix[identifier],
                        prefix[identifier+"_assertion"],
                        prefix[identifier+"_provenance"],
                        prefix[identifier+"_pubinfo"]]:
            db.remove((None,None,None,context))
        db.parse(open(OUTPUT_DIR+filename), format="trig")
    print "Done."

from fabric.api import local, lcd, get, env
from fabric.operations import require, prompt
from fabric.utils import abort
import requests
import rdflib
from rdflib.plugins.stores.sparqlstore import SPARQLUpdateStore
import getpass
import urllib2
import os.path
import os
import setlr
from os import listdir
from rdflib import *

XML_DIR='xml/'
OUTPUT_DIR='nanopublications/'
SETL_FILE='xml.setl.ttl'
PROCESS_FILE_COUNT=None
#PROCESS_FILE_COUNT=20

setl = Namespace('http://purl.org/twc/vocab/setl/')
prov = Namespace('http://www.w3.org/ns/prov#')
dc = Namespace('http://purl.org/dc/terms/')
pv = Namespace('http://purl.org/net/provenance/ns#')


def convert_xml():
    setl_graph = Graph()
    setl_graph.load(SETL_FILE,format="turtle")
    cwd = os.getcwd()
    for filename in os.listdir(XML_DIR)[:PROCESS_FILE_COUNT]:
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
        for graph in resources.values():
            if hasattr(graph, 'close'):
                print "Closing",graph.identifier
                graph.close()

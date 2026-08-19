---
layout: archive
title: "Ari Pomeranz"
description: "Academic CV of Ari Pomeranz, mathematics Ph.D. student at Georgia Institute of Technology."
permalink: /cv/
author_profile: true
redirect_from:
  - /resume
---

{% include base_path %}

**Ph.D. Student in Mathematics, Georgia Institute of Technology**  
[apomeranz3@gatech.edu](mailto:apomeranz3@gatech.edu)

Education
======
* **Ph.D. in Mathematics**, Georgia Institute of Technology, 2022–Present  
  Advisor: [Professor Matthew Baker](https://sites.google.com/view/mattbakermath/home/)
* **B.S. in Mathematics**, University of Maryland, College Park, 2018–2022

Research Interests
======
* Matroid and polymatroid theory
* M-convex sets and Lorentzian polynomials
* Representability of matroids and matroids over tracts

Preprints
======
<ul>{% for post in site.publications reversed %}
  {% if post.status == 'preprint' %}
    {% include archive-single-cv.html %}
  {% endif %}
{% endfor %}</ul>

Publications
======
<ul>{% for post in site.publications reversed %}
  {% unless post.status == 'preprint' %}
    {% include archive-single-cv.html %}
  {% endunless %}
{% endfor %}</ul>

Teaching Experience
======
<ul>{% for post in site.teaching reversed %}
  {% include archive-single-cv.html %}
{% endfor %}</ul>
